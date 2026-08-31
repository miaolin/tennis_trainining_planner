// One plan, shared between devices.
//
// There is no account here. A device holds a random 16-character sync code and
// sends only the SHA-256 of it, so the code itself never leaves the browser and
// this function cannot tell you what it is. Whoever has the code has the plan;
// with 80 bits of entropy behind the hash, nobody is going to find one by
// guessing. That is the whole of the security model, and it is written down
// here so nobody mistakes it for more than it is.
//
//   GET  /api/plan?k=<64 hex>   -> 200 {updatedAt, state} | 404 if never written
//   PUT  /api/plan?k=<64 hex>   {updatedAt, base, state}
//                               -> 200 {updatedAt} | 409 {updatedAt, state}
//
// A PUT carries `base`: the updatedAt this device last saw. If the stored copy
// has moved on since, the write is refused with 409 and the stored copy comes
// back, so the other device's work is never quietly overwritten. Sending
// base:null forces the write, which is what "keep mine" does.

const KEY_RE = /^[a-f0-9]{64}$/;
const MAX_BYTES = 512 * 1024;         // a plan is a couple of KB; this is generous
const TTL_SECONDS = 400 * 24 * 60 * 60;

/* ------------------------------------------------------------- storage ---
   Vercel hands out Redis in two shapes and it is not worth caring which. A
   marketplace Upstash store injects a REST URL and token, which needs nothing
   but fetch. Vercel's own managed Redis injects a REDIS_URL connection string,
   which needs the redis client — imported only on that path, so the REST setup
   and the tests never have to have it installed. */

// Vercel prefixes a store's variables with the store's own name, so a store
// called "tennis plan" arrives as tennis_plan_REDIS_URL and not REDIS_URL.
// Take the plain name when it is there, and otherwise whatever the store called
// itself — connecting a store stays the whole of the setup, with nothing to
// rename by hand.
function envEndingWith(suffix) {
  if (process.env[suffix]) return { value: process.env[suffix], prefix: '' };
  const name = Object.keys(process.env)
    .filter((k) => k.length > suffix.length && k.endsWith(suffix) && process.env[k])
    .sort()[0];
  return name ? { value: process.env[name], prefix: name.slice(0, -suffix.length) } : null;
}

function restConfig() {
  for (const urlName of ['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL']) {
    const found = envEndingWith(urlName);
    if (!found) continue;
    // The token has to be the one belonging to this store, not another's.
    const tokenName = urlName.replace(/_URL$/, '_TOKEN');
    const token = process.env[found.prefix + tokenName] || process.env[tokenName];
    if (token) return { url: found.value.replace(/\/+$/, ''), token };
  }
  return null;
}

function redisUrl() {
  for (const name of ['REDIS_URL', 'KV_URL']) {
    const found = envEndingWith(name);
    if (found) return found.value;
  }
  return null;
}

function restStore(cfg) {
  const command = async (args) => {
    const r = await fetch(cfg.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!r.ok) throw new Error(`store responded ${r.status}`);
    const body = await r.json();
    if (body.error) throw new Error(body.error);
    return body.result;
  };
  return {
    get: (key) => command(['GET', key]),
    set: (key, value) => command(['SET', key, value, 'EX', String(TTL_SECONDS)]),
  };
}

// One client per warm instance. A serverless function is reused between
// requests, so reconnecting on every one would cost more than the work does.
let client = null;
let connecting = null;
async function redisClient(url) {
  if (client && client.isOpen) return client;
  if (!connecting) {
    const { createClient } = await import('redis');
    client = createClient({ url });
    // An error event with no listener takes the whole process down, and a
    // dropped idle connection is not worth dying over — the next request
    // opens a new one.
    client.on('error', () => {});
    connecting = client.connect()
      .catch((e) => { client = null; throw e; })
      .finally(() => { connecting = null; });
  }
  await connecting;
  return client;
}

function redisStore(url) {
  return {
    get: async (key) => (await redisClient(url)).get(key),
    set: async (key, value) => (await redisClient(url)).set(key, value, { EX: TTL_SECONDS }),
  };
}

export function store() {
  const rest = restConfig();
  if (rest) return restStore(rest);
  const url = redisUrl();
  return url ? redisStore(url) : null;
}

/* ----------------------------------------------------------------- api --- */

function send(res, code, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(code).end(JSON.stringify(body));
}

function safeParse(v) {
  try { return JSON.parse(v); } catch (e) { return null; }
}

// A stored document is only ever what this function wrote, but it is read back
// from a store that could have been reached another way, so it is checked.
export function readDoc(raw) {
  if (typeof raw !== 'string') return null;
  const doc = safeParse(raw);
  if (!doc || typeof doc !== 'object') return null;
  if (!Number.isFinite(doc.updatedAt) || !doc.state || typeof doc.state !== 'object') return null;
  return doc;
}

export default async function handler(req, res) {
  const s = store();
  if (!s) {
    return send(res, 503, { error: 'Sync is not set up on this deployment yet.' });
  }

  const k = String((req.query && req.query.k) || '');
  if (!KEY_RE.test(k)) return send(res, 400, { error: 'Bad sync key.' });
  const key = `plan:${k}`;

  try {
    if (req.method === 'GET') {
      const doc = readDoc(await s.get(key));
      return doc ? send(res, 200, doc) : send(res, 404, { error: 'Nothing stored for that code yet.' });
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
      if (!body || typeof body !== 'object') return send(res, 400, { error: 'Bad body.' });
      if (!body.state || typeof body.state !== 'object') return send(res, 400, { error: 'No plan in the body.' });

      const updatedAt = Number(body.updatedAt);
      if (!Number.isFinite(updatedAt)) return send(res, 400, { error: 'Bad updatedAt.' });

      const doc = JSON.stringify({ updatedAt, state: body.state });
      if (doc.length > MAX_BYTES) return send(res, 413, { error: 'That plan is too large to sync.' });

      // base:null forces the write; otherwise the stored copy must be the one
      // this device last saw.
      if (body.base !== null && body.base !== undefined) {
        const have = readDoc(await s.get(key));
        if (have && have.updatedAt > Number(body.base)) return send(res, 409, have);
      }

      await s.set(key, doc);
      return send(res, 200, { updatedAt });
    }
  } catch (e) {
    // The store being unreachable is not the caller's fault, and the message
    // stays vague on purpose — it can carry connection details.
    return send(res, 502, { error: 'The sync store could not be reached.' });
  }

  res.setHeader('Allow', 'GET, PUT');
  return send(res, 405, { error: 'Use GET or PUT.' });
}
