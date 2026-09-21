import "dotenv/config";
import { readFileSync } from "node:fs";
import { decide } from "./decide.js";
import type { SpendDecisionRequest } from "./types.js";

async function main() {
  const file = process.argv[2];
  let req: SpendDecisionRequest;

  if (file) {
    req = JSON.parse(readFileSync(file, "utf8")) as SpendDecisionRequest;
  } else {
    req = {
      task: {
        goal: "Get a one-shot order book snapshot to decide whether to trade",
        remaining_budget_usd: 1.0,
        max_per_call_usd: 0.2,
      },
      payment_required: {
        amount_usd: 0.05,
        network: "eip155:8453",
        asset: "USDC",
        description: "Order book snapshot API for pair XYZ",
        resource: "https://example.com/v1/book",
      },
    };
  }

  const result = await decide(req);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
