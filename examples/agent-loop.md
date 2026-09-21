# Drop spend-gate into an agent loop

Pattern: **detect 402 → ask gate → only then sign**.

```ts
type GateDecision = "pay" | "skip" | "escalate";

async function fetchWithSpendGate(
  url: string,
  init: RequestInit,
  ctx: {
    gateUrl: string;
    goal: string;
    remainingBudgetUsd: number;
    maxPerCallUsd: number;
    signAndRetry: (paymentRequired: unknown) => Promise<Response>;
    escalate: (detail: unknown) => Promise<void>;
  },
): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status !== 402) return res;

  const paymentRequired = await res.json(); // shape depends on your x402 client
  const amountUsd = Number(paymentRequired.amount ?? paymentRequired.maxAmountRequired);

  const gate = await fetch(`${ctx.gateUrl}/v1/spend-decision`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      task: {
        goal: ctx.goal,
        remaining_budget_usd: ctx.remainingBudgetUsd,
        max_per_call_usd: ctx.maxPerCallUsd,
      },
      payment_required: {
        amount_usd: amountUsd,
        network: paymentRequired.network,
        asset: paymentRequired.asset,
        description: paymentRequired.description,
        resource: url,
      },
    }),
  }).then((r) => r.json()) as { decision: GateDecision; detail?: string };

  if (gate.decision === "pay") {
    return ctx.signAndRetry(paymentRequired);
  }
  if (gate.decision === "escalate") {
    await ctx.escalate(gate);
    throw new Error("spend-gate: escalated");
  }
  throw new Error(`spend-gate: skip (${gate.detail ?? "no detail"})`);
}
```

Tips:

- Keep signing keys in the agent / wallet SDK — never inside Spend Gate.
- Prefer a **Gate-dedicated** TypeSafe key so spend decisions are auditable.
- Over-budget paths never call Jev; use them in tests without an API key (`npm run demo`).
