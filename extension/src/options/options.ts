import browser from "../lib/browser.js";
import { getSettings, saveSettings, type Settings } from "../lib/settings.js";
import { listLinks } from "../lib/api.js";

const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const msg = document.getElementById("msg") as HTMLParagraphElement;

function readInputs(): Settings {
  return {
    serverUrl: $("serverUrl").value.trim().replace(/\/+$/, ""),
    accessClientId: $("accessClientId").value.trim(),
    accessClientSecret: $("accessClientSecret").value.trim(),
  };
}

function setMsg(text: string, color = ""): void {
  msg.textContent = text;
  msg.style.color = color;
}

// Request host permission for just this origin (least privilege). Returns false
// if the origin is invalid or the grant was denied.
async function ensureHostPermission(serverUrl: string): Promise<boolean> {
  try {
    const origin = new URL(serverUrl).origin + "/*";
    return await browser.permissions.request({ origins: [origin] });
  } catch {
    return false;
  }
}

async function init() {
  const s = await getSettings();
  $("serverUrl").value = s.serverUrl;
  $("accessClientId").value = s.accessClientId;
  $("accessClientSecret").value = s.accessClientSecret;
}

async function onSave() {
  const settings = readInputs();
  if (!settings.serverUrl) {
    setMsg("Server URL is required.", "crimson");
    return;
  }
  await saveSettings(settings);
  const granted = await ensureHostPermission(settings.serverUrl);
  setMsg(
    granted ? "Saved." : "Saved, but host permission was denied — grant it so the extension can reach your server.",
    granted ? "" : "crimson",
  );
}

async function onTest() {
  const settings = readInputs();
  if (!settings.serverUrl || !settings.accessClientId || !settings.accessClientSecret) {
    setMsg("Fill in all three fields first.", "crimson");
    return;
  }
  setMsg("Testing…");
  // Need the host permission before the request can leave the browser.
  if (!(await ensureHostPermission(settings.serverUrl))) {
    setMsg("✗ Host permission denied — can't reach the server.", "crimson");
    return;
  }
  try {
    const links = await listLinks(settings);
    setMsg(`✓ Connected — ${links.length} recent link${links.length === 1 ? "" : "s"}.`, "green");
  } catch (err) {
    setMsg(`✗ ${(err as Error).message}`, "crimson");
  }
}

document.getElementById("save")!.addEventListener("click", onSave);
document.getElementById("test")!.addEventListener("click", onTest);
init();
