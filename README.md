# spend-gate

Buyer-side **spend decision gate** for agentic [x402](https://www.x402.org/) payments.

When an agent receives HTTP 402 Payment Required, call this gate **before signing**. It returns `pay` / `skip` / `escalate`.

```
AI agent → (hits paid resource) → x402 402
        → Spend Gate (rules + Jev) → pay | skip | escalate
        → if pay: sign & retry
```

Hard budget checks run in **code** first (no model call). Semantic fit / value-for-price use **TypeSafe Jev**.

## Quick start

```bash
# Node 20+
cp .env.example .env
# Edit .env — set TYPESAFE_API_KEY to a Gate-dedicated TypeSafe key
# (keep personal / demo keys separate)

npm install
npm start
```

Health check:

```bash
curl -s http://127.0.0.1:8787/health
```

Decide:

```bash
curl -s http://127.0.0.1:8787/v1/spend-decision \
  -H 'content-type: application/json' \
  -d @examples/sample-request.json | jq
```

CLI (no server):

```bash
npm run decide -- examples/sample-request.json
npm run decide -- examples/over-budget.json   # skips without calling Jev
```

## API

### `POST /v1/spend-decision`

See `examples/sample-request.json` for the body shape.

Response (example):

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

| `decision` | Meaning |
|------------|---------|
| `pay` | Sign and retry the x402 request |
| `skip` | Do not pay; try another path |
| `escalate` | Ask a human / stronger model |

Over-budget requests set `ruled_out_by_code: true` and **do not** call TypeSafe.

## Pricing (x402)

`POST /v1/spend-decision` is gated by **x402**. Callers pay `GATE_PRICE_USD` (default **$0.001** USDC) to cover TypeSafe Jev cost plus a small margin. `GET /` and `GET /health` stay free.

| Env | Meaning |
|-----|---------|
| `X402_PAY_TO` | Your `0x` wallet (secret on Workers) |
| `X402_NETWORK` | `base` (mainnet) or `base-sepolia` (test) |
| `GATE_PRICE_USD` | Per-decision price, e.g. `0.001` |
| `X402_REQUIRED` | If `true` and pay-to missing → 503 |

Without `X402_PAY_TO`, local Node stays free (`X402_REQUIRED=false`). Once pay-to is set, unpaid calls get HTTP 402.

## Deploy (Cloudflare Workers)

No custom domain required. Uses `*.workers.dev`.

```bash
npm install
npx wrangler login          # once, in the browser
npx wrangler secret put TYPESAFE_API_KEY
npx wrangler secret put X402_PAY_TO    # 0x… receiving address
npm run deploy
```

Live: `https://spend-gate.472hico.workers.dev`

```bash
curl -s https://spend-gate.472hico.workers.dev/health
# Unpaid decide → HTTP 402 with PAYMENT-REQUIRED (when X402_PAY_TO is set)
curl -si https://spend-gate.472hico.workers.dev/v1/spend-decision \
  -H 'content-type: application/json' \
  -d @examples/sample-request.json | head
```

**Note:** until `X402_PAY_TO` is set, the public Worker may still allow free decisions. Set the wallet secret to start charging.

## Secrets

- Local: `.env` (gitignored).
- Workers: `wrangler secret put …`.
- Keep a **Gate-dedicated** TypeSafe key separate from personal demos.

## License

MIT — see [LICENSE](./LICENSE).

## Status

MVP / early OSS. This service decides whether to pay **other** x402 resources; calling the gate itself can also require x402.
