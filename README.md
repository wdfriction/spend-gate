# spend-gate

[日本語](README.ja.md)

**Don't let your AI agent open-wallet every HTTP 402.**

`spend-gate` is a buyer-side **spend decision gate** for agentic [x402](https://www.x402.org/) payments. When an agent hits `402 Payment Required`, call the gate **before signing**. It returns:

| Decision | Meaning |
|----------|---------|
| `pay` | Sign and retry |
| `skip` | Do not pay; try another path |
| `escalate` | Ask a human / stronger model |

Hard budget checks run in **code first** (no model call). Semantic fit and value-for-price use **[TypeSafe Jev](https://docs.typesafe.ai/introduction)**.

```
AI agent → (paid resource) → HTTP 402
        → Spend Gate (rules + Jev) → pay | skip | escalate
        → if pay: sign & retry with x402
```

Live health: [spend-gate.472hico.workers.dev/health](https://spend-gate.472hico.workers.dev/health)

## Why this exists

Agent frameworks are learning to pay. Most demos still do the dangerous default: **if 402 → pay**. That burns budget on junk endpoints, phishing APIs, and overpriced data.

Spend Gate splits the problem the way it should be split:

1. **Code** — never over `remaining_budget` or `max_per_call` (deterministic, free, fast)
2. **Judgment** — is this resource actually useful for the goal at this price? (Jev)

## 30-second demo (no API key)

Budget rules reject without calling any model:

```bash
git clone https://github.com/472hico/spend-gate.git
cd spend-gate
npm install
npm run demo
```

Expected:

```json
{
  "decision": "skip",
  "reason_codes": ["over_remaining_budget"],
  "ruled_out_by_code": true
}
```

## Quick start (full decisions)

```bash
cp .env.example .env
# set TYPESAFE_API_KEY to a Gate-dedicated TypeSafe key

npm start
# or one-shot:
npm run decide -- examples/sample-request.json
```

```bash
curl -s http://127.0.0.1:8787/v1/spend-decision \
  -H 'content-type: application/json' \
  -d @examples/sample-request.json | jq
```

### Drop into an agent loop

```ts
// Pseudocode — call before you sign an x402 payment
const gate = await fetch("https://your-gate.example/v1/spend-decision", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    task: {
      goal: agent.goal,
      remaining_budget_usd: agent.budgetLeft,
      max_per_call_usd: agent.maxPerCall,
    },
    payment_required: {
      amount_usd: offer.amountUsd,
      network: offer.network,
      asset: offer.asset,
      description: offer.description,
      resource: offer.url,
    },
  }),
}).then((r) => r.json());

if (gate.decision === "pay") await signAndRetry(offer);
else if (gate.decision === "skip") continue;
else await askHuman(gate);
```

See [`examples/agent-loop.md`](examples/agent-loop.md).

## API

### `POST /v1/spend-decision`

Request shape: [`examples/sample-request.json`](examples/sample-request.json)

```json
{
  "decision": "pay",
  "reason_codes": ["within_budget", "task_fit_ok", "value_ok", "approve_pay"],
  "scores": { "task_fit": 0.72, "value_for_price": 0.68 },
  "selected_option_id": null,
  "model": "jev-1.x.x",
  "ruled_out_by_code": false
}
```

Over-budget requests set `ruled_out_by_code: true` and **do not** call TypeSafe.

| Endpoint | Auth |
|----------|------|
| `GET /` | free |
| `GET /health` | free |
| `POST /v1/spend-decision` | free locally; **x402** on the public Worker (`$0.001` USDC default) |

## Pricing (x402)

The public gate can charge callers so Jev cost is covered:

| Env | Meaning |
|-----|---------|
| `X402_PAY_TO` | Your `0x` wallet |
| `X402_NETWORK` | `base` or `base-sepolia` |
| `GATE_PRICE_USD` | Per-decision price (default `0.001`) |
| `X402_REQUIRED` | `false` for free local Node |

## Deploy (Cloudflare Workers)

```bash
npx wrangler login
npx wrangler secret put TYPESAFE_API_KEY
npx wrangler secret put X402_PAY_TO
npm run deploy
```

## Status

MVP / early OSS. Designed as a **decision service**, not a wallet. Signing stays in your agent.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Bug reports and “agent adapter” PRs (LangGraph, OpenAI Agents, custom loops) are especially welcome.

## License

MIT — see [LICENSE](./LICENSE).
