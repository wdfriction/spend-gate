import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { decide } from "./decide.js";
import type { SpendDecisionRequest } from "./types.js";

const app = new Hono();

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "spend-gate",
    has_typesafe_key: Boolean(process.env.TYPESAFE_API_KEY),
  }),
);

app.post("/v1/spend-decision", async (c) => {
  let body: SpendDecisionRequest;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  if (!body?.task || !body?.payment_required) {
    return c.json(
      { error: "task and payment_required are required" },
      400,
    );
  }

  try {
    const result = await decide(body);
    const status =
      result.reason_codes.includes("missing_api_key") ? 503 : 200;
    return c.json(result, status);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error("[spend-gate]", message);
    return c.json(
      {
        decision: "escalate",
        reason_codes: ["upstream_error"],
        scores: { task_fit: null, value_for_price: null },
        selected_option_id: null,
        model: null,
        ruled_out_by_code: false,
        detail: "Upstream judgment failed; do not pay without review.",
      },
      502,
    );
  }
});

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, () => {
  console.log(`spend-gate listening on http://127.0.0.1:${port}`);
  console.log(`  GET  /health`);
  console.log(`  POST /v1/spend-decision`);
});
