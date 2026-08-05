import { definePlugin } from "emdash";
import type { PluginContext } from "emdash";

/**
 * Insert Scripts — for EmDash
 * =========================================================================
 * DEFINITION (this file) — runs at REQUEST TIME. Pointed to by the descriptor's
 * `entrypoint`. Contains the admin settings form and the injection hook.
 */

// The admin settings form persists each field to KV as `settings:<fieldName>`.
// We read the same keys back at request time.
const KEY = {
  enabled: "settings:enabled",
  head: "settings:headScripts",
  bodyStart: "settings:bodyStartScripts",
  bodyEnd: "settings:bodyEndScripts",
  loadInAdmin: "settings:loadInAdmin",
  excludePaths: "settings:excludePaths",
} as const;

type Scope = "head" | "bodyStart" | "bodyEnd";

interface PageFragments {
  head: string[];
  bodyStart: string[];
  bodyEnd: string[];
}

/** Best-effort extraction of the current request path from the hook event. */
function pathFromEvent(event: unknown): string | null {
  const e = event as Record<string, any> | null;
  const raw =
    e?.url ??
    e?.pathname ??
    e?.path ??
    e?.route?.pathname ??
    e?.request?.url ??
    null;
  if (!raw) return null;
  try {
    return new URL(raw, "http://x").pathname;
  } catch {
    return typeof raw === "string" ? raw : null;
  }
}

function asHtml(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseExcludes(value: unknown): string[] {
  return asHtml(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function pathIsExcluded(path: string, patterns: string[]): boolean {
  return patterns.some((p) => {
    if (p.endsWith("*")) return path.startsWith(p.slice(0, -1));
    return path === p || path.startsWith(p + "/");
  });
}

export default definePlugin({
  // ---- Admin panel UI (Settings → Insert Headers and Footers) -------------
  // NOTE: if the settings form doesn't render, your build may expect this
  // block in the DESCRIPTOR instead — move `admin` to src/index.ts's return.
  // And if it spells multiline fields `{ type: "textarea" }`, swap the type.
  admin: {
    settingsSchema: {
      enabled: {
        type: "boolean",
        label: "Enable injection",
        help: "Master switch. When off, nothing is injected anywhere.",
        default: true,
      },
      headScripts: {
        type: "text",
        multiline: true,
        format: "code",
        label: "Header — inside <head>",
        help: "Analytics, GTM, verification <meta>, <link> preconnects, inline <style>. Rendered as-is.",
        default: "",
      },
      bodyStartScripts: {
        type: "text",
        multiline: true,
        format: "code",
        label: "Body — right after <body>",
        help: "GTM <noscript>, tag-manager body snippet, skip-links.",
        default: "",
      },
      bodyEndScripts: {
        type: "text",
        multiline: true,
        format: "code",
        label: "Footer — right before </body>",
        help: "Deferred scripts, chat widgets, pixels that don't need to block render.",
        default: "",
      },
      excludePaths: {
        type: "text",
        multiline: true,
        label: "Exclude paths (one per line)",
        help: "Paths to skip. Supports a trailing wildcard, e.g. /checkout or /tag/*",
        default: "",
      },
      loadInAdmin: {
        type: "boolean",
        label: "Also inject on EmDash admin pages",
        help: "Leave OFF. Admin routes (/_emdash/*) are skipped by default — tag managers can interfere with the passkey admin.",
        default: false,
      },
    },
  },

  // ---- Runtime injection --------------------------------------------------
  hooks: {
    "page:fragments": async (
      event: unknown,
      ctx: PluginContext,
    ): Promise<PageFragments> => {
      const empty: PageFragments = { head: [], bodyStart: [], bodyEnd: [] };

      const enabled = (await ctx.kv.get<boolean>(KEY.enabled)) ?? true;
      if (!enabled) return empty;

      const path = pathFromEvent(event);
      if (path) {
        const loadInAdmin = (await ctx.kv.get<boolean>(KEY.loadInAdmin)) ?? false;
        if (!loadInAdmin && path.startsWith("/_emdash")) return empty;

        const excludes = parseExcludes(await ctx.kv.get<string>(KEY.excludePaths));
        if (pathIsExcluded(path, excludes)) return empty;
      }

      const scopes: Record<Scope, string> = {
        head: asHtml(await ctx.kv.get<string>(KEY.head)),
        bodyStart: asHtml(await ctx.kv.get<string>(KEY.bodyStart)),
        bodyEnd: asHtml(await ctx.kv.get<string>(KEY.bodyEnd)),
      };

      const fragments: PageFragments = {
        head: scopes.head ? [scopes.head] : [],
        bodyStart: scopes.bodyStart ? [scopes.bodyStart] : [],
        bodyEnd: scopes.bodyEnd ? [scopes.bodyEnd] : [],
      };

      const total =
        fragments.head.length + fragments.bodyStart.length + fragments.bodyEnd.length;
      if (total > 0) {
        ctx.log.info(
          `Injected fragments into ${total} scope(s)` + (path ? ` for ${path}` : ""),
        );
      }
      return fragments;
    },
  },
});
