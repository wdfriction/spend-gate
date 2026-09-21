# Security policy

## Supported versions

Until the first stable release, only the latest `main` is supported.

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/472hico/spend-gate/security/advisories/new).

Do **not** post:

- TypeSafe API keys
- Wallet private keys or seed phrases
- Facilitator credentials

Spend Gate is a **decision service**. Signing must stay in the caller’s wallet / agent. If you find a path that causes payment without a `pay` decision, or bypasses x402 when `X402_REQUIRED=true`, report it privately.
