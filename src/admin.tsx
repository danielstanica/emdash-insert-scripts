import { apiFetch as baseFetch, parseApiResponse } from "emdash/plugin-utils";
import * as React from "react";

const API = "/_emdash/api/plugins/insertscripts";

async function apiFetch(route: string, body?: unknown): Promise<Response> {
  return baseFetch(`${API}/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  fontSize: "0.8rem",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  resize: "vertical",
};

function Textarea({
  label,
  help,
  value,
  rows,
  onChange,
}: {
  label: string;
  help?: string;
  value: string;
  rows?: number;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label style={{ display: "block", fontWeight: 500, marginBottom: 4, fontSize: "0.875rem" }}>
        {label}
      </label>
      {help && <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: 4 }}>{help}</div>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows ?? 6}
        style={inputStyle}
        spellCheck={false}
      />
    </div>
  );
}

function SettingsPage() {
  const [settings, setSettings] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    apiFetch("settings")
      .then(async (res) => {
        const data = await parseApiResponse<{ settings: Record<string, string> }>(res);
        setSettings(data.settings || {});
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  const update = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await apiFetch("settings/save", { settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(String(err));
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading settings…</div>;
  if (error) return <div style={{ padding: "2rem", color: "#dc2626" }}>Error: {error}</div>;

  const enabled = (settings.enabled ?? "true") !== "false";

  return (
    <div style={{ maxWidth: 720, padding: "1.5rem 0" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Insert Scripts</h1>
      <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1.5rem" }}>
        Raw HTML injected into every public page. Treat these fields as trusted code.
      </p>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => update("enabled", e.target.checked ? "true" : "false")}
        />
        Enable injection
      </label>

      <Textarea
        label="Header — inside <head>"
        help="Analytics, GTM, verification meta tags, preconnects, inline styles."
        value={settings.headScripts || ""}
        onChange={(v) => update("headScripts", v)}
      />
      <Textarea
        label="Footer — before </body>"
        help="Deferred scripts, chat widgets, pixels."
        value={settings.bodyEndScripts || ""}
        onChange={(v) => update("bodyEndScripts", v)}
      />
      <Textarea
        label="Exclude paths (one per line)"
        help="Trailing wildcard supported, e.g. /checkout or /tag/*"
        value={settings.excludePaths || ""}
        rows={3}
        onChange={(v) => update("excludePaths", v)}
      />

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "0.5rem 1.5rem",
          borderRadius: 6,
          background: "#1f2937",
          color: "white",
          border: "none",
          cursor: saving ? "wait" : "pointer",
          fontWeight: 500,
        }}
      >
        {saving ? "Saving…" : "Save Settings"}
      </button>
      {saved && (
        <span style={{ marginLeft: 12, color: "#16a34a", fontSize: "0.875rem" }}>Settings saved!</span>
      )}
    </div>
  );
}

export const pages = {
  "/settings": SettingsPage,
};
