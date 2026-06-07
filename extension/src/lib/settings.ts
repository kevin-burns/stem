import browser from "./browser.js";

export interface Settings {
  serverUrl: string;
  accessClientId: string;
  accessClientSecret: string;
}

const KEYS = ["serverUrl", "accessClientId", "accessClientSecret"] as const;

export async function getSettings(): Promise<Settings> {
  const raw = (await browser.storage.local.get(KEYS as unknown as string[])) as Partial<Settings>;
  return {
    serverUrl: raw.serverUrl ?? "",
    accessClientId: raw.accessClientId ?? "",
    accessClientSecret: raw.accessClientSecret ?? "",
  };
}

export async function saveSettings(s: Settings): Promise<void> {
  await browser.storage.local.set({ ...s });
}

export function isConfigured(s: Settings): boolean {
  return Boolean(s.serverUrl && s.accessClientId && s.accessClientSecret);
}
