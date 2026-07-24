import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const versionFile = path.join(extensionRoot, "openplc-editor.version.json");
const destinationRoot = path.join(
  extensionRoot,
  "client/src/plcopen/vendor/openplc-editor/src",
);

const version = JSON.parse(fs.readFileSync(versionFile, "utf8"));
const repository = process.env.OPENPLC_EDITOR_REPOSITORY ?? version.repository;
const localSource = process.env.OPENPLC_EDITOR_SOURCE;
const update = process.argv.includes("--update");

const roots = [
  "frontend/components/_features/[workspace]/editor/graphical/index.tsx",
  "frontend/components/_features/[workspace]/editor/monaco/configs/languages/st/st.register.ts",
  "frontend/components/_features/[workspace]/editor/monaco/configs/themes/openplc/openplc.register.ts",
  "frontend/components/_organisms/variables-editor/index.tsx",
  "frontend/components/_organisms/panel/index.tsx",
  "frontend/components/_organisms/workspace-activity-bar/ladder-toolbox.tsx",
  "frontend/components/_organisms/workspace-activity-bar/fbd-toolbox.tsx",
  "frontend/store/index.ts",
  "frontend/utils/PLC/pou-text-parser.ts",
  "frontend/utils/PLC/pou-text-serializer.ts",
  "frontend/components/_atoms/react-flow/style.css",
  "backend/shared/styles/globals.css",
];

const extensions = [
  "", ".ts", ".tsx", ".js", ".jsx", ".json", ".css",
  "/index.ts", "/index.tsx", "/index.js", "/index.jsx",
];

const visited = new Set();
const externalPackages = new Set();

function resolveLocalImport(sourceRoot, fromFile, specifier) {
  let base;
  if (specifier.startsWith("@root/")) {
    base = path.join(sourceRoot, specifier.slice("@root/".length));
  } else if (specifier.startsWith(".")) {
    base = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return undefined;
  }

  for (const extension of extensions) {
    const candidate = `${base}${extension}`;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return undefined;
}

function copyDependency(sourceRoot, file) {
  const absolute = path.resolve(file);
  if (visited.has(absolute)) return;
  visited.add(absolute);

  const relative = path.relative(sourceRoot, absolute);
  if (relative.startsWith("..")) throw new Error(`Dependency escaped OpenPLC src: ${absolute}`);
  if (relative.includes(`${path.sep}__tests__${path.sep}`) || /\.(test|spec)\.[jt]sx?$/.test(relative)) return;

  const destination = path.join(destinationRoot, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(absolute, destination);

  if (!/\.[jt]sx?$/.test(absolute)) return;
  const source = fs.readFileSync(absolute, "utf8");
  const importPattern = /(?:^|\n)\s*(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g;
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    const dependency = resolveLocalImport(sourceRoot, absolute, specifier);
    if (dependency) copyDependency(sourceRoot, dependency);
    else if (!specifier.startsWith(".") && !specifier.startsWith("@root/")) {
      externalPackages.add(specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0]);
    }
  }
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
}

function acquireRepository() {
  if (localSource) {
    return { root: path.resolve(localSource), cleanup: () => {}, commit: git(["rev-parse", "HEAD"], localSource) };
  }

  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "openplc-editor-"));
  const cloneRoot = path.join(temporaryRoot, "source");
  const ref = update ? version.branch : version.commit;
  git(["clone", "--quiet", "--filter=blob:none", "--no-checkout", repository, cloneRoot]);
  git(["checkout", "--quiet", ref], cloneRoot);
  return { root: cloneRoot, cleanup: () => fs.rmSync(temporaryRoot, { recursive: true, force: true }), commit: git(["rev-parse", "HEAD"], cloneRoot) };
}

const repositoryState = acquireRepository();
try {
  const sourceRoot = path.join(repositoryState.root, "src");
  fs.rmSync(destinationRoot, { recursive: true, force: true });
  fs.mkdirSync(destinationRoot, { recursive: true });
  for (const root of roots) copyDependency(sourceRoot, path.join(sourceRoot, root));
  fs.copyFileSync(path.join(repositoryState.root, "LICENSE"), path.join(destinationRoot, "LICENSE"));

  const nextVersion = { ...version, commit: repositoryState.commit };
  fs.writeFileSync(versionFile, `${JSON.stringify(nextVersion, null, 2)}\n`);
  console.log(`Vendored OpenPLC Editor ${repositoryState.commit.slice(0, 12)} (${visited.size} source files).`);
  console.log(`External packages: ${[...externalPackages].sort().join(" ")}`);
} finally {
  repositoryState.cleanup();
}
