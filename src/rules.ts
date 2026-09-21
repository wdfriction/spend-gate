import type { SpendDecisionRequest, SpendDecisionResponse } from "./types.js";

/** Hard budget / sanity checks. Never call the model if these fail. */
export function applyHardRules(
  req: SpendDecisionRequest,
): SpendDecisionResponse | null {
  const { task, payment_required: pay } = req;
  const reasons: string[] = [];

  if (
    !Number.isFinite(task.remaining_budget_usd) ||
    !Number.isFinite(task.max_per_call_usd) ||
    !Number.isFinite(pay.amount_usd)
  ) {
    return skip(["invalid_numbers"], "Budget or amount is not a finite number.");
  }

  if (pay.amount_usd < 0) {
    return skip(["negative_amount"], "Payment amount is negative.");
  }

  if (pay.amount_usd > task.remaining_budget_usd) {
    reasons.push("over_remaining_budget");
  }
  if (pay.amount_usd > task.max_per_call_usd) {
    reasons.push("over_max_per_call");
  }

  if (reasons.length > 0) {
    return skip(reasons, "Rejected by hard budget rules before model call.");
  }

  return null;
}

function skip(
  reason_codes: string[],
  detail: string,
): SpendDecisionResponse {
  return {
    decision: "skip",
    reason_codes,
    scores: { task_fit: null, value_for_price: null },
    selected_option_id: null,
    model: null,
    ruled_out_by_code: true,
    detail,
  };
}
