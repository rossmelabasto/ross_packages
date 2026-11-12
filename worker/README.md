# repo.rossmel.com Worker

`repo.rossmel.com` is a Cloudflare Worker (custom domain) in front of the GitHub Pages site of this
repo (`rossmelabasto.github.io/ross_packages`). It passes every request through unchanged and
counts downloads and update checks in a D1 database, anonymously:

| Stored | Not stored |
| --- | --- |
| day, package or index, format (pacman, apt, dnf, F-Droid, APK, rOS), program, version | IP address |
| kind of client (pacman, apt, dnf, F-Droid, browser…) | user agent string |
| country, as Cloudflare reports it | anything that tells one person from another |

Rows are counts per day. Index fetches (`ross.db`, `InRelease`, `repomd.xml`, F-Droid's index)
are machines looking for updates, so per day they roughly match the installed machines.

- `worker.js`: the Worker; `classify()` decides what a request was.
- `deploy.sh`: uploads it (token and ids come from the owner's local config, not this repo).
- Schema: one table, `hits (day, kind, fmt, item, version, client, country, count)` with those
  first seven columns as the primary key.
