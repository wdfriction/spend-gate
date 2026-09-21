/**
 * Zero-config demo: hard budget rules reject without calling TypeSafe.
 * Run: npm run demo
 */
import { decide } from "../src/decide.js";
import type { SpendDecisionRequest } from "../src/types.js";

const overBudget: SpendDecisionRequest = {
  task: {
    goal: "Get a one-shot order book snapshot to decide whether to trade",
    remaining_budget_usd: 0.01,
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

console.log("spend-gate demo — hard rules only (no API key)\n");
console.log("Request: pay $0.05 with only $0.01 remaining budget\n");

const result = await decide(overBudget);

console.log(JSON.stringify(result, null, 2));
console.log(`
Next steps
  • Full Jev judgment:  cp .env.example .env  # set TYPESAFE_API_KEY
                        npm run decide -- examples/sample-request.json
  • Local server:       npm start
  • Live health:        curl -s https://spend-gate.472hico.workers.dev/health
`);
