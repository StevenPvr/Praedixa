// Product event types — behavioral instrumentation for UX outcomes

export type ProductEventName =
  | "decision_queue_opened"
  | "decision_option_selected"
  | "decision_validated"
  | "time_to_decision_ms"
  | "onboarding_step_completed";

export interface ProductEvent {
  name: ProductEventName;
  occurredAt?: string;
  context?: Record<string, unknown>;
}

export interface ProductEventBatchRequest {
  events: ProductEvent[];
}
