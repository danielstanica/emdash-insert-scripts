# emdash-insert-scripts

Inject custom scripts, styles, meta tags, and HTML into every page of your
EmDash site — configured from the admin panel. Two injection points:

- **Header** — inside `<head>` (via `render:inject-head`)
- **Footer** — right before `</body>` (via `render:inject-body-end`)

Plus a master on/off switch and a path-exclusion list. Admin routes
(`/_emdash/*`) are never touched.

## Requirements

EmDash with the `page:inject` capability and `render:inject-head` /
`render:inject-body-end` hooks (EmDash `>=0.21`). This is a **native** plugin —
it installs via your Astro config, not the marketplace, because raw HTML
injection requires build-time integration.

## Install

```bash
npm install github:danielstanica/emdash-insert-scripts
```

Register it in `astro.config.mjs` — in `plugins: []` (native plugins only run
there):

```js
import { defineConfig } from "astro/config";
import emdash from "emdash";
import { insertScriptsPlugin } from "emdash-insert-scripts";

export default defineConfig({
  integrations: [
    emdash({
      plugins: [
        // ...your other plugins...
        insertScriptsPlugin(),
      ],
    }),
  ],
});
```

Deploy, then configure at **Admin → Plugins → Insert Scripts → Settings**.

## Structure

Single-file native plugin, mirroring the shape EmDash uses for
`@jdevalk/emdash-plugin-seo`:

- `insertScriptsPlugin()` — descriptor (build time), imported in the config
- `createPlugin` (default export) — runtime definition with the inject hooks,
  loaded via the descriptor's `entrypoint`

Settings persist to plugin KV under `settings:*` and are read back in the
inject hooks.

## Security

This plugin injects raw, unescaped HTML into every page — the one thing
EmDash's sandbox is designed to prevent, which is why it must be native.
Treat whatever you paste into the settings fields as trusted first-party code.

## License

MIT © Daniel Stanica
