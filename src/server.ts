import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp, type GateBindings } from "./app.js";

const bindings: GateBindings = {
  TYPESAFE_API_KEY: process.env.TYPESAFE_API_KEY ?? "",
  TYPESAFE_MODEL: process.env.TYPESAFE_MODEL,
  TASK_FIT_THRESHOLD: process.env.TASK_FIT_THRESHOLD,
  VALUE_THRESHOLD: process.env.VALUE_THRESHOLD,
  X402_PAY_TO: process.env.X402_PAY_TO,
  X402_NETWORK: process.env.X402_NETWORK,
  X402_FACILITATOR_URL: process.env.X402_FACILITATOR_URL,
  GATE_PRICE_USD: process.env.GATE_PRICE_USD,
  // Local default: free unless X402_PAY_TO is set (then middleware charges).
  X402_REQUIRED: process.env.X402_REQUIRED ?? "false",
};

const app = createApp();
const port = Number(process.env.PORT ?? 8787);

serve(
  {
    fetch: (req) => app.fetch(req, bindings),
    port,
  },
  () => {
    console.log(`spend-gate listening on http://127.0.0.1:${port}`);
    console.log(`  GET  /`);
    console.log(`  GET  /health`);
    console.log(`  POST /v1/spend-decision`);
  },
);
