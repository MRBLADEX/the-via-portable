# VIA Keyboard

**Language:** English | [简体中文](README.zh-CN.md)

**Official upstream repository:** [github.com/the-via/app](https://github.com/the-via/app)

This project is based on VIA's open-source web application for configuring [QMK](https://qmk.fm) keyboards. This fork adds an Electron desktop wrapper that builds as a Windows x64 Portable executable. The browser-based development workflow remains available.

## Keyboard definitions

The app reads its bundled keyboard definitions from `public/definitions/`. The folder normally contains `supported_kbs.json`, `hash.json`, and the `v2/` and `v3/` definition directories. It is git-ignored and is included in local builds when present.

If `public/definitions/` is missing, the development and desktop build scripts bootstrap the standard definitions. If you have a local definitions bundle, place it at `public/definitions/` before building. For one-off testing, sideload a VIA-compatible V2 or V3 definition JSON through **Settings → Show Design tab → Design → Load Draft Definition**. A definition loaded this way is saved in the app's local profile; it is not added to the executable or written to the keyboard. To bundle a definition for future builds, add it to the matching `v2/` or `v3/` directory, update `supported_kbs.json` and `hash.json`, then rebuild.

## Run in a web browser

Install dependencies and start the Vite development server:

```bash
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173). The development server bootstraps standard definitions if `public/definitions/` does not already exist.

## Run in Electron during development

Build the desktop UI, then launch Electron:

```bash
bun run build:desktop
bun run desktop
```

## Build the Windows Portable executable

```bash
bun install
bun run build:portable
```

The build packages the production UI and the definitions in `public/definitions/`; it does not start the Vite development server. The executable is written to `release/VIA-Keyboard-1.0.0-portable.exe`. The build is unsigned, so Windows may show an unknown publisher warning.
