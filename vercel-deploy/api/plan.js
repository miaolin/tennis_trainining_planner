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

// Vercel KV and Upstash-on-Vercel inject different names for the same REST API.
function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

async function command(s, args) {
  const r = await fetch(s.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${s.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`store responded ${r.status}`);
  const body = await r.json();
  if (body.error) throw new Error(body.error);
  return body.result;
}

function send(res, code, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(code).end(JSON.stringify(body));
}

// A stored document is only ever what this function wrote, but it is read back
// from a store that could have been reached another way, so it is checked.
function readDoc(raw) {
  if (typeof raw !== 'string') return null;
  try {
    const doc = JSON.parse(raw);
    if (!doc || typeof doc !== 'object') return null;
    if (!Number.isFinite(doc.updatedAt) || !doc.state || typeof doc.state !== 'object') return null;
    return doc;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  const s = store();
  if (!s) {
    return send(res, 503, { error: 'Sync is not set up on this deployment yet.' });
  }

  const k = String((req.query && req.query.k) || '');
  if (!KEY_RE.test(k)) return send(res, 400, { error: 'Bad sync key.' });
  const key = `plan:${k}`;

  if (req.method === 'GET') {
    const doc = readDoc(await command(s, ['GET', key]));
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
      const have = readDoc(await command(s, ['GET', key]));
      if (have && have.updatedAt > Number(body.base)) return send(res, 409, have);
    }

    await command(s, ['SET', key, doc, 'EX', String(TTL_SECONDS)]);
    return send(res, 200, { updatedAt });
  }

  res.setHeader('Allow', 'GET, PUT');
  return send(res, 405, { error: 'Use GET or PUT.' });
}

function safeParse(v) {
  try { return JSON.parse(v); } catch (e) { return null; }
}
