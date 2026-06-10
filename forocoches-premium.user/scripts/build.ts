import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { readdir } from "node:fs/promises";

const projectRoot = resolve(import.meta.dirname, "..");
const repoRoot = resolve(projectRoot, "..");
const originalUserscriptPath = resolve(repoRoot, "forocoches-premium.user.js");
const distDir = resolve(projectRoot, "dist");
const bundledPath = resolve(distDir, "bundle.js");
const generatedPath = resolve(distDir, "forocoches-premium.user.js");

async function build() {
  const [header, css] = await Promise.all([
    readFile(resolve(projectRoot, "src/userscript-header.txt"), "utf8"),
    (async () => {
      const styleDirectory = resolve(projectRoot, "src/styles/parts");
      const styleFiles = (await readdir(styleDirectory))
        .filter((file) => file.endsWith(".css"))
        .sort()
        .map((file) => resolve(styleDirectory, file));

      const styleContents = await Promise.all(
        styleFiles.map((path) => readFile(path, "utf8")),
      );

      return styleContents.join("\n");
    })(),
  ]);
  const previousUserscript = await readFile(originalUserscriptPath, "utf8");

  await mkdir(dirname(bundledPath), { recursive: true });
  await writeFile(originalUserscriptPath, "");

  let result: Awaited<ReturnType<typeof Bun.build>>;

  try {
    result = await Bun.build({
      define: {
        __FC_PREMIUM_CSS__: JSON.stringify(css),
      },
      entrypoints: [resolve(projectRoot, "src/index.ts")],
      format: "iife",
      minify: false,
      sourcemap: "none",
      target: "browser",
    });
  } catch (error) {
    await writeFile(originalUserscriptPath, previousUserscript);
    throw error;
  }

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log);
    }

    await writeFile(originalUserscriptPath, previousUserscript);
    throw new Error("Bun build failed");
  }

  const output = result.outputs[0];

  if (!output) {
    throw new Error("Bun build did not return a JavaScript output");
  }

  const bundle = await output.text();
  const userscript = `${header.trimEnd()}\n\n${bundle.trimStart()}`;

  await writeFile(bundledPath, bundle);
  await writeFile(generatedPath, userscript);

  await writeFile(originalUserscriptPath, userscript);

  console.log(`Wrote ${originalUserscriptPath}`);
}

await build();
