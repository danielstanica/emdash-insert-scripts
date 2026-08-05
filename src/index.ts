import { definePlugin } from "emdash";
import type { PluginDescriptor, PluginContext, RouteContext } from "emdash";

/**
 * emdash-insertscripts
 * =========================================================================
 * Native EmDash plugin. Injects admin-configured HTML/scripts into the
 * rendered page via render:inject-head and render:inject-body-end, with a
 * React settings page under Plugins → Insert Scripts.
 *
 * Structure follows @jdevalk/emdash-plugin-seo (same EmDash generation):
 *   - descriptor factory (build time) with adminEntry + adminPages
 *   - createPlugin() default (runtime) with hooks, routes, admin.pages
 *   - src/admin.tsx exports `pages` mapping each adminPage path to a component
 * Settings persist to plugin KV under `settings:*`.
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
  const enabled = asHtml(await ctx.kv.get<string>(KEY.enabled));
  if (enabled === "false") return true; // default: enabled
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
    id: "insertscripts",
    version: "1.0.0",
    format: "native",
    entrypoint: new URL("./index.ts", import.meta.url).pathname,
    adminEntry: new URL("./admin.tsx", import.meta.url).pathname,
    adminPages: [{ path: "/settings", label: "Insert Scripts", icon: "code" }],
    options: {},
  };
}

// ---- Definition (runtime) — default export, loaded via entrypoint -------
export function createPlugin() {
  return definePlugin({
    id: "insertscripts",
    version: "1.0.0",
    capabilities: ["page:inject"],

    hooks: {
      "render:inject-head": { handler: injectHead, priority: 10 },
      "render:inject-body-end": { handler: injectBodyEnd, priority: 10 },
    },

    routes: {
      "settings": {
        handler: async (ctx: RouteContext) => {
          const entries = await ctx.kv.list("settings:");
          const settings: Record<string, string> = {};
          for (const { key, value } of entries) {
            settings[key.replace("settings:", "")] =
              typeof value === "string" ? value : String(value ?? "");
          }
          return { settings };
        },
      },
      "settings/save": {
        handler: async (ctx: RouteContext) => {
          const { settings } = ctx.input as { settings: Record<string, string> };
          for (const [key, value] of Object.entries(settings)) {
            await ctx.kv.set(`settings:${key}`, value ?? "");
          }
          return { ok: true };
        },
      },
    },

    admin: {
      pages: [{ path: "/settings", label: "Insert Scripts", icon: "code" }],
    },
  });
}

export default createPlugin;
