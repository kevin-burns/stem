import browser from "../lib/browser.js";
import { getSettings, saveSettings, type Settings } from "../lib/settings.js";

const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const msg = document.getElementById("msg") as HTMLParagraphElement;

async function init() {
  const s = await getSettings();
  $("serverUrl").value = s.serverUrl;
  $("accessClientId").value = s.accessClientId;
  $("accessClientSecret").value = s.accessClientSecret;
}

async function onSave() {
  const settings: Settings = {
    serverUrl: $("serverUrl").value.trim().replace(/\/+$/, ""),
    accessClientId: $("accessClientId").value.trim(),
    accessClientSecret: $("accessClientSecret").value.trim(),
  };
  if (!settings.serverUrl) {
    msg.textContent = "Server URL is required.";
    return;
  }
  await saveSettings(settings);

  // Request host permission for just this origin (least privilege).
  try {
    const origin = new URL(settings.serverUrl).origin + "/*";
    const granted = await browser.permissions.request({ origins: [origin] });
    msg.textContent = granted ? "Saved." : "Saved, but host permission was denied — the popup can't reach your server until it's granted.";
  } catch {
    msg.textContent = "Saved.";
  }
}

document.getElementById("save")!.addEventListener("click", onSave);
init();
