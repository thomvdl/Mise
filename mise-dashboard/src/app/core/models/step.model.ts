export interface Step {
  id: number;
  position: number;
  instruction: string;
  timer_minutes: number | null;
}

/** Payload shape for a step row within a fiche-technique write payload. */
export interface StepPayload {
  instruction: string;
  timer_minutes: number | null;
}
