import { build as esbuild } from "esbuild";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, cp, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileP = promisify(execFile);
const root = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const dist = path.join(root, "dist");

const TARGETS = {
  chrome: (m) => ({ ...m, background: undefined }),
  firefox: (m) => ({
    ...m,
    background: undefined,
    browser_specific_settings: { gecko: { id: "url-shortener@kevinburns", strict_min_version: "121.0" } },
  }),
};

async function buildTarget(name, transform, baseManifest) {
  const out = path.join(dist, name);
  await rm(out, { recursive: true, force: true });
  await mkdir(path.join(out, "popup"), { recursive: true });
  await mkdir(path.join(out, "options"), { recursive: true });

  await esbuild({
    entryPoints: [path.join(root, "src/popup/popup.ts"), path.join(root, "src/options/options.ts")],
    bundle: true,
    format: "iife",
    target: "es2022",
    outdir: out,
    outbase: path.join(root, "src"),
    logLevel: "info",
  });

  await cp(path.join(root, "src/popup/popup.html"), path.join(out, "popup/popup.html"));
  await cp(path.join(root, "src/popup/popup.css"), path.join(out, "popup/popup.css"));
  await cp(path.join(root, "src/options/options.html"), path.join(out, "options/options.html"));
  await cp(path.join(root, "src/icons"), path.join(out, "icons"), { recursive: true });

  const manifest = JSON.parse(JSON.stringify(transform(baseManifest)));
  await writeFile(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`built ${name} → ${out}`);
}

const baseManifest = JSON.parse(await readFile(path.join(root, "manifest.base.json"), "utf8"));
for (const [name, transform] of Object.entries(TARGETS)) {
  await buildTarget(name, transform, baseManifest);
}
if (process.argv.includes("--zip")) {
  for (const name of Object.keys(TARGETS)) {
    await execFileP("zip", ["-r", "-q", path.join(dist, `${name}.zip`), "."], { cwd: path.join(dist, name) });
    console.log(`packed ${name}.zip`);
  }
}
console.log("done");
