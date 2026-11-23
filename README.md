# ross_packages

The source of <https://repo.rossmel.com>: the website for my programs and the signed package
repositories behind it.

- **`[ross]`** is the one repository, for any distribution (pacman, APT and DNF, plus AppImages). It has my programs, whose
  release workflows build them (see [ross_visualizer](https://github.com/rossmelabasto/ross_visualizer)), and on pacman
  also the packages of [rOS](https://ros.rossmel.com), my flavor of Arch Linux. Those are files of the
  [`x86_64`](../../releases/tag/x86_64) release of this repo: each deploy downloads them and signs them with the same key.
  (Until 2026-11-22 the rOS packages had their own `[ros]` repository; it was merged into `[ross]`.)

repo.rossmel.com itself is a Cloudflare Worker in front of GitHub Pages that counts downloads anonymously: see [worker/](worker/).

No binaries live in git. `.github/workflows/deploy.yml` downloads the newest packages on each
deploy, runs `build.mjs` over `site/` and publishes everything to GitHub Pages. A program's
release triggers it by pushing its version to `sources/`.

## Using `[ross]`

```sh
curl -fsSL https://repo.rossmel.com/key.asc | sudo pacman-key --add -
sudo pacman-key --lsign-key C08F57FCE06B95B52145012C274187B9D5E9FFEB
```

```ini
[ross]
SigLevel = Required DatabaseRequired
Server = https://repo.rossmel.com/arch/x86_64
```

pacman rejects any package without a valid signature from that key
(`ross packages`, `C08F 57FC E06B 95B5 2145 012C 2741 87B9 D5E9 FFEB`). The `ros-keyring` package keeps the keys up to date.
More instructions (APT, DNF, F-Droid) are at <https://repo.rossmel.com/repository/>.
