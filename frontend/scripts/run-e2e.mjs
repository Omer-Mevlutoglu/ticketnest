import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = path.resolve(frontendDir, "../backend");
const children = [];
let cleaningUp = false;

const start = (args, options) => {
  const child = spawn(process.execPath, args, {
    stdio: "inherit",
    detached: process.platform !== "win32",
    ...options,
  });
  children.push(child);
  return child;
};

const stopTree = (child) => {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    // The process already exited between the status check and the signal.
  }
};

const cleanup = () => {
  if (cleaningUp) return;
  cleaningUp = true;
  for (const child of children.reverse()) stopTree(child);
};

process.once("SIGINT", () => {
  cleanup();
  process.exit(130);
});
process.once("SIGTERM", () => {
  cleanup();
  process.exit(143);
});
process.once("exit", cleanup);

const waitFor = async (url, child, label) => {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`${label} exited before it became ready`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Expected while the service and replica set are starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} did not become ready within 120 seconds`);
};

try {
  const backend = start(
    ["-r", "ts-node/register", "src/scripts/startE2EServer.ts"],
    { cwd: backendDir, env: process.env }
  );
  await waitFor("http://127.0.0.1:5100/healthz", backend, "Browser-test API");

  const frontend = start(
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      "4173",
      "--strictPort",
    ],
    {
      cwd: frontendDir,
      env: { ...process.env, VITE_API_BASE: "http://127.0.0.1:5100" },
    }
  );
  await waitFor("http://127.0.0.1:4173", frontend, "Browser-test frontend");

  const playwright = start(
    ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
    { cwd: frontendDir, env: process.env }
  );
  const exitCode = await new Promise((resolve) =>
    playwright.once("exit", (code) => resolve(code ?? 1))
  );
  cleanup();
  process.exit(exitCode);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  cleanup();
  process.exit(1);
}
