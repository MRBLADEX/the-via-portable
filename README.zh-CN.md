# VIA Keyboard

**语言：** [English](README.md) | 简体中文

**官方上游仓库：** [github.com/the-via/app](https://github.com/the-via/app)

本项目基于 VIA 开源网页应用，用于配置 [QMK](https://qmk.fm) 键盘。本 Fork 增加了 Electron 桌面封装，可构建为 Windows x64 Portable 单文件程序；同时保留了通过浏览器运行开发版的方式。

## 键盘定义

程序从 `public/definitions/` 读取打包的键盘定义。该目录通常包含 `supported_kbs.json`、`hash.json` 以及 `v2/`、`v3/` 定义目录。此目录已加入 `.gitignore`；本地构建时如果存在，会一并打包。

如果 `public/definitions/` 不存在，网页开发和桌面构建脚本会自动初始化标准定义。如果你有本地定义集合，请在构建前将其放到 `public/definitions/`。临时测试单个定义时，可以在程序中依次打开 **Settings → Show Design tab → Design → Load Draft Definition**，载入 VIA 兼容的 V2 或 V3 definition JSON。通过此方式载入的定义会保存在本机应用数据中，不会自动打进 EXE，也不会写入键盘。若要将定义随之后构建的 EXE 一起分发，请把文件放入对应的 `v2/` 或 `v3/` 目录，更新 `supported_kbs.json` 和 `hash.json`，然后重新构建。

## 在浏览器中运行

安装依赖并启动 Vite 开发服务器：

```bash
bun install
bun run dev
```

然后打开 [http://localhost:5173](http://localhost:5173)。如果 `public/definitions/` 不存在，开发服务器会自动初始化标准键盘定义。

## 在 Electron 中运行开发版

先构建桌面 UI，再启动 Electron：

```bash
bun run build:desktop
bun run desktop
```

## 构建 Windows Portable 程序

```bash
bun install
bun run build:portable
```

构建会把生产版 UI 和 `public/definitions/` 中的定义一起打包，不会在运行时启动 Vite 开发服务器。生成文件位于 `release/VIA-Keyboard-1.0.0-portable.exe`。程序未经代码签名，Windows 可能会显示“未知发布者”提示。
