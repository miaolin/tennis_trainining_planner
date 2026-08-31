// Tests for vercel-deploy/api/plan.js — the sync endpoint.
//
//   cd tests && npm install && npm test
//
// The REST backend is driven through a stubbed global fetch, so nothing here
// needs a Redis, a network, or the redis package installed. The connection-string
// backend imports that package lazily and is only checked for how it is chosen.

const HERE = new URL('.', import.meta.url);
const MODULE = new URL('../vercel-deploy/api/plan.js', HERE);

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else {
    fail++; failures.push(name);
    console.log('  FAIL ' + name + (extra !== undefined ? '  -> ' + extra : ''));
  }
}
function group(name) { console.log('\n[' + name + ']'); }

const KEY = 'a'.repeat(64);

// The bits of a Node response object the handler actually touches.
function fakeRes() {
  const res = {
    code: 0, headers: {}, body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.code = c; return this; },
    end(s) { this.body = s ? JSON.parse(s) : null; return this; },
  };
  return res;
}

// A Redis standing in for the REST API: one map, and the two commands used.
function restStub() {
  const kept = new Map();
  const seen = [];
  globalThis.fetch = async (url, opts) => {
    const args = JSON.parse(opts.body);
    seen.push(args);
    const [cmd, key, value] = args;
    if (cmd === 'GET') return { ok: true, json: async () => ({ result: kept.get(key) ?? null }) };
    if (cmd === 'SET') { kept.set(key, value); return { ok: true, json: async () => ({ result: 'OK' }) }; }
    return { ok: true, json: async () => ({ error: 'unknown command' }) };
  };
  return { kept, seen };
}

function useRest() {
  process.env.KV_REST_API_URL = 'https://store.example/';
  process.env.KV_REST_API_TOKEN = 'token';
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.REDIS_URL;
  delete process.env.KV_URL;
}
function useNothing() {
  ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_URL',
   'UPSTASH_REDIS_REST_TOKEN', 'REDIS_URL', 'KV_URL'].forEach(k => delete process.env[k]);
}

const { default: handler, store, readDoc } = await import(MODULE.href);

const call = async (req) => {
  const res = fakeRes();
  await handler({ method: 'GET', query: {}, ...req }, res);
  return res;
};
const plan = (n) => ({ version: 2, blocks: [{ id: 'b1', name: 'B' + n }] });

/* ------------------------------------------------------------------ */
group('with no store configured');
{
  useNothing();
  ok('the store is not picked', store() === null);
  const res = await call({ query: { k: KEY } });
  ok('every call answers 503', res.code === 503, res.code);
  ok('and says sync is not set up', /not set up/.test(res.body.error), res.body.error);
}

/* ------------------------------------------------------------------ */
group('choosing a backend');
{
  useNothing();
  process.env.REDIS_URL = 'redis://localhost:6379';
  ok('a connection string is enough', store() !== null);

  useNothing();
  process.env.KV_URL = 'rediss://localhost:6379';
  ok('so is the KV_URL Vercel KV used to inject', store() !== null);

  useNothing();
  process.env.UPSTASH_REDIS_REST_URL = 'https://store.example';
  ok('a REST url alone is not', store() === null);
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
  ok('a REST url with its token is', store() !== null);

  // REST first: it costs a fetch, not a held connection
  useRest();
  process.env.REDIS_URL = 'redis://localhost:6379';
  const stub = restStub();
  await call({ query: { k: KEY } });
  ok('REST wins when both are set', stub.seen.length === 1, JSON.stringify(stub.seen));
}

/* ------------------------------------------------------------------ */
group('the key must be a hash');
{
  useRest(); restStub();
  for (const k of ['', 'nope', 'A'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), '../etc']) {
    const res = await call({ query: { k } });
    ok(`refuses ${JSON.stringify(k.slice(0, 12))}`, res.code === 400, res.code);
  }
  const res = await call({ query: {} });
  ok('and refuses no key at all', res.code === 400, res.code);
}

/* ------------------------------------------------------------------ */
group('reading and writing');
{
  useRest();
  const stub = restStub();

  let res = await call({ query: { k: KEY } });
  ok('an unused code reads as 404', res.code === 404, res.code);
  ok('with a plain reason', /Nothing stored/.test(res.body.error), res.body.error);

  res = await call({ method: 'PUT', query: { k: KEY }, body: { updatedAt: 1000, base: null, state: plan(1) } });
  ok('a write is accepted', res.code === 200, res.code);
  ok('and echoes the stamp', res.body.updatedAt === 1000, JSON.stringify(res.body));
  ok('it is stored under the hashed key', stub.kept.has('plan:' + KEY), [...stub.kept.keys()].join());
  ok('with an expiry, so an abandoned code does not live forever',
     stub.seen.some(a => a[0] === 'SET' && a[3] === 'EX' && Number(a[4]) > 300 * 24 * 3600),
     JSON.stringify(stub.seen.filter(a => a[0] === 'SET')));

  res = await call({ query: { k: KEY } });
  ok('and reads back', res.code === 200 && res.body.updatedAt === 1000, JSON.stringify(res.body));
  ok('with the plan intact', res.body.state.blocks[0].name === 'B1', JSON.stringify(res.body.state));

  ok('nothing is cached along the way', res.headers['Cache-Control'] === 'no-store',
     res.headers['Cache-Control']);

  // a JSON string body, which is how a raw Node request arrives
  res = await call({ method: 'PUT', query: { k: KEY },
                     body: JSON.stringify({ updatedAt: 1001, base: 1000, state: plan(2) }) });
  ok('a string body is parsed too', res.code === 200, res.code);
}

/* ------------------------------------------------------------------ */
group('a write against a copy that moved on');
{
  useRest();
  const stub = restStub();
  await call({ method: 'PUT', query: { k: KEY }, body: { updatedAt: 2000, base: null, state: plan('theirs') } });

  let res = await call({ method: 'PUT', query: { k: KEY },
                         body: { updatedAt: 2500, base: 1000, state: plan('mine') } });
  ok('is refused with 409', res.code === 409, res.code);
  ok('and hands back what is stored', res.body.state.blocks[0].name === 'Btheirs',
     JSON.stringify(res.body.state));
  ok('leaving the stored copy alone',
     JSON.parse(stub.kept.get('plan:' + KEY)).state.blocks[0].name === 'Btheirs');

  res = await call({ method: 'PUT', query: { k: KEY },
                     body: { updatedAt: 2500, base: 2000, state: plan('mine') } });
  ok('writing against the current copy is fine', res.code === 200, res.code);

  res = await call({ method: 'PUT', query: { k: KEY },
                     body: { updatedAt: 3000, base: null, state: plan('forced') } });
  ok('and base:null forces past it', res.code === 200, res.code);
  ok('overwriting what was there',
     JSON.parse(stub.kept.get('plan:' + KEY)).state.blocks[0].name === 'Bforced');
}

/* ------------------------------------------------------------------ */
group('bodies that are not plans');
{
  useRest(); restStub();
  const bad = [
    ['no body', undefined],
    ['a string that is not JSON', '{oh no'],
    ['no state', { updatedAt: 1, base: null }],
    ['a state that is not an object', { updatedAt: 1, base: null, state: 'hello' }],
    ['no stamp', { base: null, state: plan(1) }],
    ['a stamp that is not a number', { updatedAt: 'now', base: null, state: plan(1) }],
  ];
  for (const [name, body] of bad) {
    const res = await call({ method: 'PUT', query: { k: KEY }, body });
    ok(`refuses ${name}`, res.code === 400, res.code);
  }

  const huge = { updatedAt: 1, base: null, state: { version: 2, blocks: [], pad: 'x'.repeat(600 * 1024) } };
  const res = await call({ method: 'PUT', query: { k: KEY }, body: huge });
  ok('and refuses one that is far too big', res.code === 413, res.code);
}

/* ------------------------------------------------------------------ */
group('what comes back out of the store');
{
  ok('a non-string is not a document', readDoc(null) === null && readDoc({}) === null);
  ok('nor is broken JSON', readDoc('{oh no') === null);
  ok('nor one with no stamp', readDoc(JSON.stringify({ state: {} })) === null);
  ok('nor one with no state', readDoc(JSON.stringify({ updatedAt: 1 })) === null);
  ok('a real one reads', readDoc(JSON.stringify({ updatedAt: 1, state: {} })).updatedAt === 1);

  // a store holding junk under the key must not become a 200 of junk
  useRest();
  const stub = restStub();
  stub.kept.set('plan:' + KEY, 'not a document');
  const res = await call({ query: { k: KEY } });
  ok('and junk in the store reads as nothing there', res.code === 404, res.code);
}

/* ------------------------------------------------------------------ */
group('other methods, and a store that will not answer');
{
  useRest(); restStub();
  for (const method of ['POST', 'DELETE', 'PATCH']) {
    const res = await call({ method, query: { k: KEY } });
    ok(`${method} is not allowed`, res.code === 405, res.code);
    ok('and says what is', res.headers.Allow === 'GET, PUT', res.headers.Allow);
  }

  useRest();
  globalThis.fetch = async () => { throw new Error('econnrefused at 10.0.0.1:6379'); };
  const res = await call({ query: { k: KEY } });
  ok('an unreachable store is a 502', res.code === 502, res.code);
  ok('and the reason gives nothing away', !/10\.0\.0\.1/.test(JSON.stringify(res.body)),
     JSON.stringify(res.body));
}

/* ------------------------------------------------------------------ */
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) {
  console.log('failed: ' + failures.join(' | '));
  process.exit(1);
}
