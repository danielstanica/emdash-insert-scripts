# Insert Scripts for EmDash

Inject arbitrary HTML — scripts, `<meta>`, `<link>`, inline CSS, GTM/analytics,
verification tags, chat widgets — into three page injection points on every
public page, managed from the EmDash admin panel:

| Setting | Injected |
| ------- | -------- |
| Header  | inside `<head>` |
| Body    | right after `<body>` opens |
| Footer  | right before `</body>` closes |

Plus a master on/off switch and a path-exclusion list. Admin routes
(`/_emdash/*`) are skipped by default.

## Why this isn't a one-click / marketplace plugin

It uses the `page:fragments` hook to inject into the page shell. That requires a
**native, in-process plugin** (build-time integration). Marketplace plugins run
sandboxed and can't do this. So it's distributed as a package and installed via
your Astro config — same as any config-based EmDash plugin.

## Install (for any EmDash site)

**1. Add the package.**

```bash
# from npm
npm install emdash-insert-scripts
# …or straight from GitHub, no npm needed
npm install github:danielstanica/emdash-insert-scripts
```

**2. Register it in `astro.config.mjs`** — in `plugins: []`, never `sandboxed: []`:

```js
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import insertScripts from "emdash-insert-scripts";

export default defineConfig({
  integrations: [
    emdash({
      plugins: [
        // ...your other plugins...
        insertScripts(),
      ],
    }),
  ],
});
```

**3. Deploy, then configure** at **Admin → Settings → Insert Headers and Footers**.

The package ships TypeScript source and is transpiled by your site's Vite build —
there's no separate build step for consumers.

## Structure

EmDash loads plugins as a descriptor plus a separate runtime module:

- `src/index.ts` — descriptor (build-time metadata + `entrypoint` pointer)
- `src/plugin.ts` — definition (runtime `page:fragments` hook + settings form)
- `package.json` — `exports["."]` → descriptor, `exports["./plugin"]` → definition

## Compatibility (EmDash is v0.x)

Two spots may need a one-line tweak on a given EmDash build; both are annotated
in the source:

1. **Settings form location** — `admin.settingsSchema` lives in `src/plugin.ts`.
   If the form doesn't render, move the `admin` block into the descriptor in
   `src/index.ts`.
2. **`page:fragments` return shape** — returns
   `{ head, bodyStart, bodyEnd }` string arrays. Adjust if your build names the
   footer point differently.

## License

MIT © Daniel Stanica
