import { Hono } from "hono";
import { cors } from "hono/cors";
import { paymentMiddleware } from "x402-hono";
import { decide } from "./decide.js";
import type { SpendDecisionRequest } from "./types.js";

export type GateBindings = {
  TYPESAFE_API_KEY: string;
  TYPESAFE_MODEL?: string;
  TASK_FIT_THRESHOLD?: string;
  VALUE_THRESHOLD?: string;
  /** Receiver wallet for Gate usage fees (x402). */
  X402_PAY_TO?: string;
  /** `base-sepolia` (test) or `base` (mainnet USDC). */
  X402_NETWORK?: string;
  X402_FACILITATOR_URL?: string;
  /** USD price per decision, e.g. `0.001` → Jev cost + margin. */
  GATE_PRICE_USD?: string;
  /**
   * When `true` (default on Workers), refuse unpaid calls if X402_PAY_TO is missing.
   * Set `false` for free local Node testing.
   */
  X402_REQUIRED?: string;
};

type X402Network = "base-sepolia" | "base";

function num(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function network(env: GateBindings): X402Network {
  return env.X402_NETWORK === "base" ? "base" : "base-sepolia";
}

function gatePriceUsd(env: GateBindings): string {
  const raw = (env.GATE_PRICE_USD || "0.001").replace(/^\$/, "");
  return raw;
}

function x402Ready(env: GateBindings): boolean {
  const payTo = env.X402_PAY_TO?.trim();
  return Boolean(payTo && /^0x[a-fA-F0-9]{40}$/.test(payTo));
}

function x402Required(env: GateBindings): boolean {
  if (env.X402_REQUIRED === "false" || env.X402_REQUIRED === "0") return false;
  if (env.X402_REQUIRED === "true" || env.X402_REQUIRED === "1") return true;
  // Default: require payment setup when running with a configured key (Workers).
  return Boolean(env.TYPESAFE_API_KEY);
}

export function createApp() {
  const app = new Hono<{ Bindings: GateBindings }>();

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
      pricing: {
        decide_usd: gatePriceUsd(c.env),
        network: network(c.env),
        x402_ready: x402Ready(c.env),
        note: "Price aims to cover TypeSafe Jev cost plus a small margin.",
      },
      docs: "https://github.com/472hico/spend-gate",
    }),
  );

  app.get("/health", (c) =>
    c.json({
      ok: true,
      service: "spend-gate",
      has_typesafe_key: Boolean(c.env.TYPESAFE_API_KEY),
      x402_ready: x402Ready(c.env),
      x402_required: x402Required(c.env),
      gate_price_usd: gatePriceUsd(c.env),
      network: network(c.env),
    }),
  );

  // Charge for judgments via x402 (Jev cost + alpha).
  app.use("/v1/spend-decision", async (c, next) => {
    if (c.req.method !== "POST") return next();

    if (!x402Ready(c.env)) {
      if (x402Required(c.env)) {
        return c.json(
          {
            error: "x402_not_configured",
            detail:
              "Set X402_PAY_TO (0x…) secret so callers pay GATE_PRICE_USD before a decision.",
          },
          503,
        );
      }
      return next();
    }

    const usd = gatePriceUsd(c.env);
    const middleware = paymentMiddleware(
      c.env.X402_PAY_TO!.trim() as `0x${string}`,
      {
        "/v1/spend-decision": {
          price: `$${usd}`,
          network: network(c.env),
          config: {
            description: `Spend Gate decision (Jev + margin) — $${usd}`,
            mimeType: "application/json",
          },
        },
      },
      {
        url: (c.env.X402_FACILITATOR_URL ||
          "https://x402.org/facilitator") as `${string}://${string}`,
      },
    );
    return middleware(c, next);
  });

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
        apiKey: c.env.TYPESAFE_API_KEY,
        model: c.env.TYPESAFE_MODEL ?? "jev-latest",
        taskFitThreshold: num(c.env.TASK_FIT_THRESHOLD, 0.55),
        valueThreshold: num(c.env.VALUE_THRESHOLD, 0.5),
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
