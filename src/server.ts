import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp, type GateBindings } from "./app.js";

const env: GateBindings = {
  TYPESAFE_API_KEY: process.env.TYPESAFE_API_KEY ?? "",
  TYPESAFE_MODEL: process.env.TYPESAFE_MODEL,
  TASK_FIT_THRESHOLD: process.env.TASK_FIT_THRESHOLD,
  VALUE_THRESHOLD: process.env.VALUE_THRESHOLD,
};

const app = createApp(env);
const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, () => {
  console.log(`spend-gate listening on http://127.0.0.1:${port}`);
  console.log(`  GET  /`);
  console.log(`  GET  /health`);
  console.log(`  POST /v1/spend-decision`);
});
