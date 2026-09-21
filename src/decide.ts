import { choice, score, TypeSafeClient } from "@typesafe-ai/sdk";
import { applyHardRules } from "./rules.js";
import type {
  SpendDecisionRequest,
  SpendDecisionResponse,
} from "./types.js";

export type DecideConfig = {
  apiKey?: string;
  model?: string;
  taskFitThreshold?: number;
  valueThreshold?: number;
};

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function decide(
  req: SpendDecisionRequest,
  config: DecideConfig = {},
): Promise<SpendDecisionResponse> {
  if (!req.task?.goal?.trim()) {
    return {
      decision: "skip",
      reason_codes: ["missing_goal"],
      scores: { task_fit: null, value_for_price: null },
      selected_option_id: null,
      model: null,
      ruled_out_by_code: true,
      detail: "task.goal is required.",
    };
  }

  const ruled = applyHardRules(req);
  if (ruled) return ruled;

  const model =
    config.model ??
    (typeof process !== "undefined" ? process.env.TYPESAFE_MODEL : undefined) ??
    "jev-latest";
  const taskFitThreshold =
    config.taskFitThreshold ??
    (typeof process !== "undefined"
      ? envNumber("TASK_FIT_THRESHOLD", 0.55)
      : 0.55);
  const valueThreshold =
    config.valueThreshold ??
    (typeof process !== "undefined" ? envNumber("VALUE_THRESHOLD", 0.5) : 0.5);

  const apiKey =
    config.apiKey ??
    (typeof process !== "undefined" ? process.env.TYPESAFE_API_KEY : undefined);
  if (!apiKey) {
    return {
      decision: "escalate",
      reason_codes: ["missing_api_key"],
      scores: { task_fit: null, value_for_price: null },
      selected_option_id: null,
      model: null,
      ruled_out_by_code: true,
      detail:
        "TYPESAFE_API_KEY is not set. Copy .env.example to .env and add a Gate-dedicated key.",
    };
  }

  const options = req.options ?? [];
  const client = new TypeSafeClient({ apiKey });

  const state = {
    task_goal: req.task.goal,
    remaining_budget_usd: req.task.remaining_budget_usd,
    max_per_call_usd: req.task.max_per_call_usd,
    payment: {
      amount_usd: req.payment_required.amount_usd,
      network: req.payment_required.network ?? null,
      asset: req.payment_required.asset ?? null,
      description: req.payment_required.description ?? null,
      resource: req.payment_required.resource ?? null,
    },
    options: options.map((o) => ({
      id: o.id,
      amount_usd: o.amount_usd,
      network: o.network ?? null,
      asset: o.asset ?? null,
      description: o.description ?? null,
    })),
  };

  const questions: Record<string, unknown> = {
    task_fit: score(
      "How well does paying for this resource help achieve the task goal, given the description and price?",
      [
        "Irrelevant or actively unhelpful for the stated goal",
        "Weak or speculative fit; probably not needed now",
        "Moderate fit; might help but alternatives may exist",
        "Strong fit; clearly useful for the goal at this price",
        "Essential for the goal; hard to proceed without it",
      ],
    ),
    value_for_price: score(
      "Is the quoted price fair relative to the likely usefulness for this task and remaining budget?",
      [
        "Far too expensive for the expected value",
        "Pricey; value is doubtful",
        "Borderline; acceptable only if needed",
        "Reasonable micropayment for the expected value",
        "Clear bargain relative to usefulness",
      ],
    ),
  };

  if (options.length > 0) {
    const criteria: Record<string, string | null> = {
      none: "Do not pay any option; skip all",
    };
    for (const o of options) {
      criteria[o.id] =
        `Pay option ${o.id}: ${o.description ?? "no description"} at ${o.amount_usd} USD` +
        (o.network ? ` on ${o.network}` : "");
    }
    questions.selected_option = choice(
      "If paying, which payment option should be selected? Choose none to skip.",
      criteria,
    );
  }

  const response = await client.systemOne({
    model,
    state,
    questions: questions as Parameters<TypeSafeClient["systemOne"]>[0]["questions"],
  });

  const taskFit = scoreValue(response.answers.task_fit);
  const valueForPrice = scoreValue(response.answers.value_for_price);
  const reason_codes: string[] = ["within_budget"];

  let selected_option_id: string | null = null;
  if (options.length > 0 && response.answers.selected_option) {
    const picked = String(
      (response.answers.selected_option as { choice?: string }).choice ?? "",
    );
    if (picked && picked !== "none") {
      selected_option_id = picked;
      reason_codes.push("option_selected");
    } else {
      reason_codes.push("no_option_selected");
      return {
        decision: "skip",
        reason_codes,
        scores: { task_fit: taskFit, value_for_price: valueForPrice },
        selected_option_id: null,
        model: response.model ?? model,
        ruled_out_by_code: false,
        detail: "Model chose not to pay any option.",
      };
    }
  }

  if (taskFit !== null && taskFit >= taskFitThreshold) {
    reason_codes.push("task_fit_ok");
  } else {
    reason_codes.push("task_fit_low");
  }
  if (valueForPrice !== null && valueForPrice >= valueThreshold) {
    reason_codes.push("value_ok");
  } else {
    reason_codes.push("value_low");
  }

  const fitOk = taskFit !== null && taskFit >= taskFitThreshold;
  const valueOk = valueForPrice !== null && valueForPrice >= valueThreshold;

  let decision: SpendDecisionResponse["decision"];
  if (fitOk && valueOk) {
    decision = "pay";
    reason_codes.push("approve_pay");
  } else if (!fitOk && !valueOk) {
    decision = "skip";
    reason_codes.push("reject_both_low");
  } else {
    decision = "escalate";
    reason_codes.push("ambiguous_scores");
  }

  return {
    decision,
    reason_codes,
    scores: { task_fit: taskFit, value_for_price: valueForPrice },
    selected_option_id,
    model: response.model ?? model,
    ruled_out_by_code: false,
  };
}

function scoreValue(answer: unknown): number | null {
  if (!answer || typeof answer !== "object") return null;
  const s = answer as { score?: number };
  return typeof s.score === "number" && Number.isFinite(s.score) ? s.score : null;
}
