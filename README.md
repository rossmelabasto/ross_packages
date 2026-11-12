# ross_packages

The source of <https://repo.rossmel.com>: the website for my programs and the signed package
repositories behind it.

- **`[ross]`** has my programs for any distribution: pacman, APT and DNF, plus AppImages.
  Each program's release workflow builds them; see
  [ross_visualizer](https://github.com/rossmelabasto/ross_visualizer).
- **`[ros]`** has the packages of [rOS](https://ros.rossmel.com), my flavor of Arch Linux. They
  are files of the [`x86_64`](../../releases/tag/x86_64) release of this repo, which is also the
  fallback `Server` when the site doesn't answer.

repo.rossmel.com itself is a Cloudflare Worker in front of GitHub Pages that counts downloads anonymously: see [worker/](worker/).

No binaries live in git. `.github/workflows/deploy.yml` downloads the newest packages on each
deploy, runs `build.mjs` over `site/` and publishes everything to GitHub Pages. A program's
release triggers it by pushing its version to `sources/`.

## Using `[ros]`

```sh
curl -fsSL https://repo.rossmel.com/ros.gpg | sudo pacman-key --add -
sudo pacman-key --lsign-key ACEE9BCE9F03BA05E7B04DBAA56F95B047B9D345
```

```ini
[ros]
SigLevel = Required DatabaseRequired
Server = https://repo.rossmel.com/$arch
Server = https://github.com/rossmelabasto/ross_packages/releases/download/$arch
```

pacman rejects any package without a valid signature from that key
(`rOS packages <packages@rossmel.com>`, `ACEE 9BCE 9F03 BA05 E7B0 4DBA A56F 95B0 47B9 D345`).
Instructions for `[ross]` are at <https://repo.rossmel.com/repository/>.
