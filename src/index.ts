import type { PluginDescriptor } from "emdash";

/**
 * Insert Scripts for EmDash
 * =========================================================================
 * DESCRIPTOR (this file) — runs at BUILD TIME in Vite when imported from
 * astro.config.mjs. It must be side-effect-free: just metadata plus an
 * `entrypoint` that points EmDash at the runtime module (./plugin).
 *
 * The actual hooks live in ./plugin.ts (the definition), loaded at request
 * time. This two-file split is required — EmDash cannot bundle a plugin whose
 * factory returns a `definePlugin({...})` result directly.
 *
 * Injecting raw HTML into the page shell (`page:fragments`) is a trusted,
 * in-process operation, so this plugin belongs in `plugins: []`, never
 * `sandboxed: []`.
 */
export function insertScripts(): PluginDescriptor {
  return {
    id: "insert-headers-and-footers",
    version: "1.0.0",
    format: "standard",
    // Resolvable module specifier -> the "./plugin" export in package.json.
    entrypoint: "emdash-insert-scripts/plugin",
    options: {},
    // Only capability needed. Reading KV settings needs none.
    capabilities: ["hooks.page-fragments:register"],
  };
}

export default insertScripts;
