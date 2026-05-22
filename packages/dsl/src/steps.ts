// `evaluate` / `instruct` steps inside an action body. The runtime
// processes steps left-to-right; an evaluate that returns false fails
// the action, an instruct that fails the agent submit() fails the
// action.

import type { Step } from "@behaviors-sh/spec";
import { actionFrame } from "./builder.ts";

export type { Step };

/**
 * Add an `evaluate` step to the current action body.
 *
 * Must be called inside an `action(...)` body — calling outside throws.
 *
 * @param expression - The expression the runtime should evaluate. Use
 *   {@link variable} / {@link constant} refs via template-literal
 *   interpolation to reference state.
 *
 * @throws If called outside an action body.
 */
export function evaluate(expression: string): void {
	actionFrame().steps.push({ evaluate: expression });
}

/**
 * Add an `instruct` step to the current action body.
 *
 * Leading and trailing whitespace are trimmed; internal runs of
 * whitespace collapse to a single space so multi-line template literals
 * don't leak indentation into the emitted instruction.
 *
 * Must be called inside an `action(...)` body — calling outside throws.
 *
 * @param text - The instruction text. Use {@link variable} / {@link constant}
 *   refs via template-literal interpolation to reference state.
 *
 * @throws If called outside an action body.
 */
export function instruct(text: string): void {
	actionFrame().steps.push({ instruct: text.trim().replace(/\s+/g, " ") });
}
