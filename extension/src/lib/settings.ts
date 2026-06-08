import browser from "./browser.js";
import { DEFAULT_QR_PRESET } from "@url-shortener/shared";

export interface QrStyle {
  preset: string;
  caption: string;
}

export interface Settings {
  serverUrl: string;
  accessClientId: string;
  accessClientSecret: string;
  qrStyle: QrStyle;
}

const KEYS = ["serverUrl", "accessClientId", "accessClientSecret", "qrStyle"] as const;

export async function getSettings(): Promise<Settings> {
  const raw = (await browser.storage.local.get(KEYS as unknown as string[])) as Partial<Settings>;
  return {
    serverUrl: raw.serverUrl ?? "",
    accessClientId: raw.accessClientId ?? "",
    accessClientSecret: raw.accessClientSecret ?? "",
    qrStyle: {
      preset: raw.qrStyle?.preset ?? DEFAULT_QR_PRESET,
      caption: raw.qrStyle?.caption ?? "SCAN ME",
    },
  };
}

export async function saveSettings(s: Settings): Promise<void> {
  await browser.storage.local.set({ ...s });
}

export function isConfigured(
  s: Pick<Settings, "serverUrl" | "accessClientId" | "accessClientSecret">,
): boolean {
  return Boolean(s.serverUrl && s.accessClientId && s.accessClientSecret);
}
