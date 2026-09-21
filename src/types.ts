export type Decision = "pay" | "skip" | "escalate";

export type TaskContext = {
  goal: string;
  remaining_budget_usd: number;
  max_per_call_usd: number;
};

export type PaymentRequired = {
  amount_usd: number;
  network?: string;
  asset?: string;
  description?: string;
  resource?: string;
};

export type PaymentOption = {
  id: string;
  amount_usd: number;
  network?: string;
  asset?: string;
  description?: string;
};

export type SpendDecisionRequest = {
  task: TaskContext;
  payment_required: PaymentRequired;
  options?: PaymentOption[];
};

export type SpendDecisionResponse = {
  decision: Decision;
  reason_codes: string[];
  scores: {
    task_fit: number | null;
    value_for_price: number | null;
  };
  selected_option_id: string | null;
  model: string | null;
  ruled_out_by_code: boolean;
  detail?: string;
};
