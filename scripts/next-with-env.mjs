/**
 * Launches the Next.js CLI with the port resolved from the project env files.
 *
 * Next.js boots its HTTP server before it reads `.env` files, so `PORT` cannot
 * live in `.env` when the CLI default (3000) is used. This wrapper loads the env
 * files itself, in Next.js' own precedence order, then passes the resolved
 * `PORT` to the child process, where `next dev` / `next start` pick it up.
 *
 * Precedence (highest first), matching Next.js:
 *   shell env  >  .env.<env>.local  >  .env.local  >  .env.<env>  >  .env
 *
 * Usage: node scripts/next-with-env.mjs <command> [...nextArgs]
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [command = "dev", ...args] = process.argv.slice(2);

// `next start` serves a production build, so it reads the production env files.
const environment = command === "start" ? "production" : "development";

// `process.loadEnvFile()` never overwrites keys that are already set, so loading
// the highest-precedence file first lets it win over the files below it.
const envFiles = [
  `.env.${environment}.local`,
  ".env.local",
  `.env.${environment}`,
  ".env",
];

for (const file of envFiles) {
  const path = join(root, file);
  if (!existsSync(path)) continue;

  try {
    process.loadEnvFile(path);
  } catch (error) {
    console.warn(`[next-with-env] skipped ${file}: ${error.message}`);
  }
}

/** Reads a `-p` / `--port` flag the caller passed through to the Next.js CLI. */
function findFlagPort(argv) {
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (arg === "-p" || arg === "--port") return argv[index + 1];
    if (arg.startsWith("--port=")) return arg.slice("--port=".length);
    if (arg.startsWith("-p") && arg.length > 2) return arg.slice(2);
  }

  return undefined;
}

// A CLI flag beats the env files, and shell env beats the files as well.
const port = findFlagPort(args) ?? (process.env.PORT?.trim() || "3000");
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");

console.log(`[next-with-env] next ${command} on http://localhost:${port}`);

const child = spawn(process.execPath, [nextBin, command, ...args], {
  stdio: "inherit",
  env: { ...process.env, PORT: port },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}

child.once("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
