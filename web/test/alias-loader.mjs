import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

function candidateUrls(specifier) {
  const relative = specifier.slice(2);
  const basePath = path.join(srcRoot, relative);
  return [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
    path.join(basePath, "index.js"),
  ].map((candidate) => pathToFileURL(candidate).href);
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    for (const url of candidateUrls(specifier)) {
      if (existsSync(fileURLToPath(url))) return { url, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}
