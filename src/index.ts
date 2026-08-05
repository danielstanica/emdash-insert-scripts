import { definePlugin } from "emdash";
import type { PluginDescriptor, PluginContext } from "emdash";

/**
 * emdash-insert-scripts
 * =========================================================================
 * Native EmDash plugin. Injects admin-configured HTML/scripts into the
 * rendered page via the render:inject-head and render:inject-body-end hooks.
 *
 * Structure mirrors the proven native-plugin shape used by
 * @jdevalk/emdash-plugin-seo on this EmDash generation:
 *   - a descriptor factory (build time), imported in astro.config.mjs
 *   - a createPlugin() default (runtime), pointed to by the descriptor's
 *     self-referential `entrypoint`
 */

const KEY = {
  enabled: "settings:enabled",
  head: "settings:headScripts",
  bodyEnd: "settings:bodyEndScripts",
  excludePaths: "settings:excludePaths",
} as const;

function asHtml(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function pathFromEvent(event: unknown): string | null {
  const e = event as Record<string, any> | null;
  const raw = e?.page?.path ?? e?.url ?? e?.path ?? e?.pathname ?? e?.request?.url ?? null;
  if (!raw) return null;
  try {
    return new URL(raw, "http://x").pathname;
  } catch {
    return typeof raw === "string" ? raw : null;
  }
}

function isExcluded(path: string | null, raw: unknown): boolean {
  if (!path) return false;
  const patterns = asHtml(raw)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return patterns.some((p) =>
    p.endsWith("*") ? path.startsWith(p.slice(0, -1)) : path === p || path.startsWith(p + "/"),
  );
}

async function shouldSkip(event: unknown, ctx: PluginContext): Promise<boolean> {
  const enabled = (await ctx.kv.get<boolean>(KEY.enabled)) ?? true;
  if (!enabled) return true;
  const path = pathFromEvent(event);
  if (path && path.startsWith("/_emdash")) return true; // never touch the admin
  return isExcluded(path, await ctx.kv.get<string>(KEY.excludePaths));
}

async function injectHead(event: unknown, ctx: PluginContext): Promise<string> {
  if (await shouldSkip(event, ctx)) return "";
  return asHtml(await ctx.kv.get<string>(KEY.head));
}

async function injectBodyEnd(event: unknown, ctx: PluginContext): Promise<string> {
  if (await shouldSkip(event, ctx)) return "";
  return asHtml(await ctx.kv.get<string>(KEY.bodyEnd));
}

// ---- Descriptor (build time) — imported in astro.config.mjs -------------
export function insertScriptsPlugin(): PluginDescriptor {
  return {
    id: "insert-scripts",
    version: "1.0.0",
    format: "native",
    entrypoint: new URL("./index.ts", import.meta.url).pathname,
    options: {},
  };
}

// ---- Definition (runtime) — default export, loaded via entrypoint -------
export function createPlugin() {
  return definePlugin({
    id: "insert-scripts",
    version: "1.0.0",
    capabilities: ["page:inject"],

    hooks: {
      "render:inject-head": { handler: injectHead, priority: 10 },
      "render:inject-body-end": { handler: injectBodyEnd, priority: 10 },
    },

    admin: {
      settingsSchema: {
        enabled: {
          type: "boolean",
          label: "Enable injection",
          default: true,
        },
        headScripts: {
          type: "text",
          multiline: true,
          label: "Header — inside <head>",
          help: "Analytics, GTM, verification meta tags, preconnects, inline styles.",
          default: "",
        },
        bodyEndScripts: {
          type: "text",
          multiline: true,
          label: "Footer — before </body>",
          help: "Deferred scripts, chat widgets, pixels.",
          default: "",
        },
        excludePaths: {
          type: "text",
          multiline: true,
          label: "Exclude paths (one per line)",
          help: "Trailing wildcard supported, e.g. /checkout or /tag/*",
          default: "",
        },
      },
    },
  });
}

export default createPlugin;
