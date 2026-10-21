# ross_ros_repo

Espejo del repositorio pacman de **rOS**, la distro personal de Rossmel basada en Arch Linux
(niri + DankMaterialShell). El repo principal es https://repo.rossmel.com; este espejo existe
para que `pacman -Syu` siga funcionando si ese servidor no responde.

Los paquetes viven como archivos del release [`x86_64`](../../releases/tag/x86_64). Están firmados
y pacman rechaza cualquiera que no tenga una firma válida de esta llave:

```
rOS packages <packages@rossmel.com>
ACEE 9BCE 9F03 BA05 E7B0  4DBA A56F 95B0 47B9 D345
```

## Uso

```sh
curl -O https://repo.rossmel.com/ros.gpg
sudo pacman-key --add ros.gpg
sudo pacman-key --lsign-key ACEE9BCE9F03BA05E7B04DBAA56F95B047B9D345
```

En `/etc/pacman.conf`:

```ini
[ros]
SigLevel = Required DatabaseRequired
Server = https://repo.rossmel.com/$arch
Server = https://github.com/rossmelabasto/ross_ros_repo/releases/download/$arch
```

Este repositorio no tiene código: lo actualiza automáticamente el script de publicación de rOS.
