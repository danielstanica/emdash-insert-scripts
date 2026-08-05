import { definePlugin } from "emdash";
import type {
  PluginDescriptor,
  PluginContext,
  PageFragmentEvent,
  PageFragmentContribution,
} from "emdash";

/**
 * emdash-insert-scripts (EmDash 0.31.x)
 * =========================================================================
 * Injects admin-configured HTML into every public page via the page:fragments
 * hook, with a React settings page under Plugins → Insert Scripts.
 *
 * Verified against emdash@0.31.1 source:
 *   - hook:        "page:fragments"
 *   - capability:  "hooks.page-fragments:register"  (page:inject is a
 *                  deprecated alias and does NOT satisfy this hook)
 *   - return:      PageFragmentContribution[] with kind:"html" and
 *                  placement "head" | "body:start" | "body:end"
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

function isExcluded(path: string, raw: unknown): boolean {
  const patterns = asHtml(raw)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return patterns.some((p) =>
    p.endsWith("*") ? path.startsWith(p.slice(0, -1)) : path === p || path.startsWith(p + "/"),
  );
}

async function pageFragments(
  event: PageFragmentEvent,
  ctx: PluginContext,
): Promise<PageFragmentContribution[]> {
  // Master switch (stored as a string by the settings form; default on).
  if (asHtml(await ctx.kv.get<string>(KEY.enabled)) === "false") return [];

  const path = event.page?.path ?? "";
  if (path.startsWith("/_emdash")) return []; // never touch the admin
  if (isExcluded(path, await ctx.kv.get<string>(KEY.excludePaths))) return [];

  const head = asHtml(await ctx.kv.get<string>(KEY.head));
  const bodyEnd = asHtml(await ctx.kv.get<string>(KEY.bodyEnd));

  const out: PageFragmentContribution[] = [];
  if (head) out.push({ kind: "html", placement: "head", html: head, key: "insert-scripts-head" });
  if (bodyEnd)
    out.push({ kind: "html", placement: "body:end", html: bodyEnd, key: "insert-scripts-body-end" });
  return out;
}

// ---- Descriptor (build time) — imported in astro.config.mjs -------------
export function insertScriptsPlugin(): PluginDescriptor {
  return {
    id: "insertscripts",
    version: "1.0.7",
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
    version: "1.0.7",
    capabilities: ["hooks.page-fragments:register"],

    hooks: {
      "page:fragments": { handler: pageFragments, priority: 10 },
    },

    routes: {
      "settings": {
        handler: async (ctx: any) => {
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
        handler: async (ctx: any) => {
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
