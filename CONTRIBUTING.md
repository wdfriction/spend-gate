# Contributing

Thanks for helping improve `spend-gate`.

## Development

- Node.js 20+
- npm 10+

```bash
git clone https://github.com/472hico/spend-gate.git
cd spend-gate
npm install
cp .env.example .env   # optional for demo; required for Jev judgments
npm run demo
npm run typecheck
```

Open an issue before large changes. Prefer small PRs.

## Good first contributions

- Agent adapter docs (LangGraph, OpenAI Agents SDK, custom loops)
- More `examples/*.json` edge cases (negative amount, missing goal, multi-option)
- Tests for `applyHardRules` / decision matrix
- Dashboard or CLI pretty-print for `reason_codes`

## Security

Do not open a public issue for key leaks or payment bypasses. See [SECURITY.md](SECURITY.md).

By contributing, you agree your contribution is licensed under MIT.
