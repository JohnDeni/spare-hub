// Production entrypoint for the ECS/Fargate container.
//
// `npm run build` (vite + @cloudflare/vite-plugin) always produces a
// Cloudflare Workers bundle (dist/server/index.js exports a plain
// `{ fetch(request, env, ctx) }` handler, dist/client holds the static
// assets Cloudflare would normally serve at the edge). Outside Workers there
// is no runtime to invoke that handler, so this file hosts it under plain
// Node with srvx (already a transitive dep via h3) and serves dist/client
// ourselves for anything that isn't an SSR route.
import { fileURLToPath } from "node:url";
import { serve } from "srvx";
import { serveStatic } from "srvx/static";
import worker from "./dist/server/index.js";

const clientDir = fileURLToPath(new URL("./dist/client", import.meta.url));

// Minimal stand-in for the Workers ExecutionContext the handler expects.
const ctx = {
  waitUntil(promise) {
    Promise.resolve(promise).catch((error) => console.error("[waitUntil]", error));
  },
  passThroughOnException() {},
};

serve({
  port: process.env.PORT || 8080,
  hostname: "0.0.0.0",
  middleware: [serveStatic({ dir: clientDir })],
  fetch: (request) => worker.fetch(request, process.env, ctx),
});
