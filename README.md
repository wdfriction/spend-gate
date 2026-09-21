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

## Secrets

- Put `TYPESAFE_API_KEY` in **`.env`** (not in shell rc files for app secrets).
- `.env` is gitignored. Commit only `.env.example`.
- Use a **separate** TypeSafe key for this project vs personal experiments so demo usage cannot drain the gate.

## License

MIT — see [LICENSE](./LICENSE).

## Status

MVP / early OSS. Wallet signing and settlement stay in your x402 client; this repo only decides whether to pay.
