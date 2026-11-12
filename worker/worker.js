// repo.rossmel.com: every request goes on to the site on GitHub Pages unchanged, and downloads
// and update checks are counted, anonymously, in the D1 database bound as DB.
//
// What is stored per request: the day, what it was (a package or an index), its format,
// program and version, the kind of client (pacman, apt, dnf, F-Droid, browser…) and the
// country Cloudflare reports. No IP address, no user agent string, nothing that tells one
// person from another. Counts are summed per day.

const ORIGIN = 'https://rossmelabasto.github.io/ross_packages';
const PUBLIC = 'https://repo.rossmel.com';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const upstream = new URL(ORIGIN + url.pathname + url.search);
    // Only what matters to GitHub Pages: copying everything would carry this domain along and
    // Pages answers "Site not found" for a domain it no longer serves.
    const headers = new Headers();
    for (const h of ['user-agent', 'accept', 'accept-encoding', 'accept-language', 'range', 'if-none-match', 'if-modified-since']) {
      const v = request.headers.get(h);
      if (v) headers.set(h, v);
    }
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    });

    // Redirects from GitHub (a missing trailing slash…) point at github.io: point them here.
    let out = response;
    const location = response.headers.get('location');
    if (location && location.startsWith(ORIGIN)) {
      out = new Response(response.body, response);
      out.headers.set('location', PUBLIC + location.slice(ORIGIN.length));
    }

    const hit = classify(url.pathname, request, response.status);
    if (hit && env.DB) ctx.waitUntil(count(env.DB, hit, request).catch(() => {}));
    return out;
  },
};

/** What a request was, or null when it isn't worth counting (assets, errors, partial resumes). */
export function classify(path, request, status) {
  if (request.method !== 'GET') return null;
  const ok = status === 200 || status === 206;
  const fresh = status === 304;
  // A resumed download is the same download: count only the start.
  const range = request.headers.get('range');
  if (range && !/^bytes=0-/.test(range)) return null;
  let m;
  const pkg = (fmt, item, version) => (ok ? { kind: 'package', fmt, item, version } : null);
  const index = (fmt, item = '*') => (ok || fresh ? { kind: 'index', fmt, item, version: '' } : null);

  // [ross]: the programs' repositories.
  if ((m = path.match(/^\/arch\/x86_64\/(.+?)-(\d[^-]*)-\d+-(?:x86_64|any)\.pkg\.tar\.zst$/))) return pkg('pacman', m[1].replace(/-bin$/, ''), m[2]);
  if (path === '/arch/x86_64/ross.db') return index('pacman');
  if ((m = path.match(/^\/apt\/pool\/main\/(.+)_(\d[^_]*)_[^_/]+\.deb$/))) return pkg('apt', m[1].replace(/_/g, '-'), m[2].replace(/-\d+$/, ''));
  if (path === '/apt/dists/stable/InRelease') return index('apt');
  if ((m = path.match(/^\/rpm\/(.+?)-(\d[^-]*)-\d+\.x86_64\.rpm$/))) return pkg('dnf', m[1].replace(/_/g, '-'), m[2]);
  if (path === '/rpm/repodata/repomd.xml') return index('dnf');
  // Android.
  if ((m = path.match(/^\/fdroid\/repo\/(.+?)-(\d[\d.]*)\.apk$/))) return pkg('fdroid', m[1], m[2]);
  if (/^\/fdroid\/repo\/(entry\.jar|index-v1\.jar|index-v2\.json)$/.test(path)) return index('fdroid');
  if ((m = path.match(/^\/download\/(.+)\.apk$/))) return pkg('apk', m[1], 'latest');
  // [ros]: the rOS packages.
  if ((m = path.match(/^\/x86_64\/(.+?)-(\d[^-]*)-\d+-(?:x86_64|any)\.pkg\.tar\.zst$/))) return pkg('ros', m[1], m[2]);
  if (path === '/x86_64/ros.db') return index('ros');
  // The compatibility check and the pages people read.
  if (path === '/check.sh') return ok ? { kind: 'check', fmt: 'script', item: 'ross-visualizer', version: '' } : null;
  if (ok && (path === '/' || /^\/[a-z0-9-]+\/(repo\/)?$/.test(path))) return { kind: 'page', fmt: 'web', item: path, version: '' };
  return null;
}

export function client(ua) {
  ua = ua || '';
  if (/^pacman\//i.test(ua)) return 'pacman';
  if (/Debian APT/i.test(ua)) return 'apt';
  if (/libdnf|dnf\//i.test(ua)) return 'dnf';
  if (/F-Droid/i.test(ua)) return 'fdroid';
  if (/Droid-ify|Neo Store|Obtainium/i.test(ua)) return 'android-store';
  if (/^curl\//i.test(ua)) return 'curl';
  if (/^Wget/i.test(ua)) return 'wget';
  if (/bot|crawl|spider|preview/i.test(ua)) return 'bot';
  if (/Mozilla/.test(ua)) return /Android/.test(ua) ? 'browser-android' : 'browser';
  return 'other';
}

async function count(db, hit, request) {
  const day = new Date().toISOString().slice(0, 10);
  const country = request.cf?.country || '??';
  await db
    .prepare(
      `INSERT INTO hits (day, kind, fmt, item, version, client, country, count) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
       ON CONFLICT (day, kind, fmt, item, version, client, country) DO UPDATE SET count = count + 1`,
    )
    .bind(day, hit.kind, hit.fmt, hit.item, hit.version, client(request.headers.get('user-agent')), country)
    .run();
}
