// Minimal fetch wrapper for jttsingapore.com.
//
// Two site quirks force this to exist:
//  1. The apex host 404s on content paths and the origin rejects the default
//     Node user-agent, so requests go to `www.` with a browser UA.
//  2. Switching season is a POST to `/fg-set.html` that stores the choice in a
//     session cookie; Node's fetch keeps no cookie jar, so we carry one.

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

export class Session {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
  }

  #cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  #absorb(res) {
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  async #request(path, init = {}) {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const headers = { 'User-Agent': UA, Referer: this.baseUrl, ...init.headers };
    const cookie = this.#cookieHeader();
    if (cookie) headers.Cookie = cookie;

    const res = await fetch(url, { ...init, headers, redirect: 'follow' });
    this.#absorb(res);
    const body = await res.text();

    // LeagueRepublic answers 202 with an empty body for its client-rendered
    // pages. That is not a transient failure — it means the data is not there.
    if (res.status === 202 && body.length === 0) {
      throw new Error(`${url} returned 202 with an empty body (client-rendered, no data)`);
    }
    if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
    return { body, url: res.url };
  }

  get(path) {
    return this.#request(path);
  }

  postForm(path, fields) {
    return this.#request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString(),
    });
  }
}
