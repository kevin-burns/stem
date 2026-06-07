import browser from "../lib/browser.js";
import { getSettings, isConfigured, type Settings } from "../lib/settings.js";
import { createLink, listLinks } from "../lib/api.js";
import { isValidSlug } from "@url-shortener/shared";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const msg = $<HTMLParagraphElement>("msg");
let settings: Settings;

function expiryToFields(value: string): { expires_at?: number | null; max_clicks?: number | null } {
  const now = Math.floor(Date.now() / 1000);
  switch (value) {
    case "1h": return { expires_at: now + 3600 };
    case "24h": return { expires_at: now + 86400 };
    case "7d": return { expires_at: now + 604800 };
    case "once": return { max_clicks: 1 };
    default: return {};
  }
}

function host(url: string): string {
  try { return new URL(url).host; } catch { return ""; }
}

async function renderRecent(q?: string): Promise<void> {
  const recent = $<HTMLDivElement>("recent");
  try {
    const links = await listLinks(settings, q);
    recent.innerHTML = "";
    for (const l of links.slice(0, 10)) {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between bg-white p-2 rounded border text-xs shadow-sm";
      const span = document.createElement("span");
      span.className = "truncate w-40";
      span.textContent = `${host(settings.serverUrl)}/${l.slug}`;
      const btn = document.createElement("button");
      btn.className = "btn-copy";
      btn.textContent = "Copy";
      btn.onclick = () => navigator.clipboard.writeText(`${settings.serverUrl}/${l.slug}`);
      row.append(span, btn);
      recent.append(row);
    }
  } catch (err) {
    // textContent (not innerHTML): the message can include server-supplied text.
    recent.innerHTML = "";
    const p = document.createElement("p");
    p.className = "text-xs text-red-600";
    p.textContent = (err as Error).message;
    recent.append(p);
  }
}

async function onShorten(): Promise<void> {
  const url = $<HTMLInputElement>("url").value.trim();
  const slug = $<HTMLInputElement>("slug").value.trim();
  if (!url) { msg.textContent = "No URL to shorten."; return; }
  if (slug && !isValidSlug(slug)) { msg.textContent = "Invalid slug."; return; }
  msg.textContent = "Shortening…";
  try {
    const created = await createLink(settings, { url, slug: slug || undefined, ...expiryToFields($<HTMLSelectElement>("expiry").value) });
    await navigator.clipboard.writeText(created.short_url);
    msg.textContent = `Copied ${created.short_url}` + (created.stripped.length ? ` — stripped ${created.stripped.length} tracker(s)` : "");
    $<HTMLInputElement>("slug").value = "";
    renderRecent();
  } catch (err) {
    msg.textContent = (err as Error).message;
  }
}

async function init(): Promise<void> {
  settings = await getSettings();
  if (!isConfigured(settings)) {
    $("setup").classList.remove("hidden");
    $("form").classList.add("hidden");
    $("openOptions").addEventListener("click", (e) => { e.preventDefault(); browser.runtime.openOptionsPage(); });
    return;
  }
  $("slugPrefix").textContent = `${host(settings.serverUrl)}/`;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) $<HTMLInputElement>("url").value = tab.url;
  $("shorten").addEventListener("click", onShorten);
  let t: ReturnType<typeof setTimeout>;
  $("search").addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => renderRecent($<HTMLInputElement>("search").value.trim() || undefined), 200);
  });
  renderRecent();
}

init();
