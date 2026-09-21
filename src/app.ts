import { Hono } from "hono";
import { cors } from "hono/cors";
import { decide } from "./decide.js";
import type { SpendDecisionRequest } from "./types.js";

export type GateBindings = {
  TYPESAFE_API_KEY: string;
  TYPESAFE_MODEL?: string;
  TASK_FIT_THRESHOLD?: string;
  VALUE_THRESHOLD?: string;
};

function num(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function createApp(env: GateBindings) {
  const app = new Hono();

  app.use("*", cors());

  app.get("/", (c) =>
    c.json({
      service: "spend-gate",
      description:
        "Buyer-side spend decision gate for agentic x402 payments. Call before signing.",
      endpoints: {
        health: "GET /health",
        decide: "POST /v1/spend-decision",
      },
      docs: "https://github.com/472hico/spend-gate",
      note: "Uses the operator's TypeSafe (Jev) quota. Be kind.",
    }),
  );

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "spend-gate",
      has_typesafe_key: Boolean(env.TYPESAFE_API_KEY),
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
      const result = await decide(body, {
        apiKey: env.TYPESAFE_API_KEY,
        model: env.TYPESAFE_MODEL ?? "jev-latest",
        taskFitThreshold: num(env.TASK_FIT_THRESHOLD, 0.55),
        valueThreshold: num(env.VALUE_THRESHOLD, 0.5),
      });
      const status = result.reason_codes.includes("missing_api_key")
        ? 503
        : 200;
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

  return app;
}
