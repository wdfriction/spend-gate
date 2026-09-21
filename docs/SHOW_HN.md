# Show HN draft — spend-gate

Copy/paste when ready. Keep the first paragraph punchy.

---

**Title:** Show HN: Spend Gate – don't let your AI agent pay every HTTP 402

**Body:**

Agents are starting to pay for APIs via x402 (HTTP 402 + stablecoin). Most demos still do the scary default: if 402 → sign.

Spend Gate sits in front of signing:

1. Hard budget rules in code (no model) — over remaining budget / max per call → skip
2. TypeSafe Jev scores task-fit and value-for-price → pay | skip | escalate

```
agent → 402 → spend-gate → pay|skip|escalate → only then sign
```

30s demo, no API key:

```
git clone https://github.com/472hico/spend-gate.git && cd spend-gate
npm i && npm run demo
```

Live health: https://spend-gate.472hico.workers.dev/health  
Repo: https://github.com/472hico/spend-gate

Happy to take feedback on the decision API and agent-adapter docs.

---

## X / Bluesky (short)

AI agents that can pay need a brake, not just a wallet.

spend-gate: before you sign an x402 402, ask pay | skip | escalate.
Hard budgets in code. Semantic judgment via TypeSafe Jev.

`npm run demo` — no API key
https://github.com/472hico/spend-gate

---

## Checklist before posting

- [ ] `npm run demo` works on a clean clone
- [ ] README hook is clear in the first screenful
- [ ] Live `/health` returns ok
- [ ] No secrets in examples / screenshots
- [ ] GitHub topics set: `x402`, `ai-agents`, `micropayments`, `typescript`, `cloudflare-workers`
