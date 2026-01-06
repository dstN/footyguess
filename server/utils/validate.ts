import { safeParse, type BaseSchema, type BaseIssue } from "valibot";

export function parseSchema<TInput, TOutput, TIssue extends BaseIssue<unknown>>(
  schema: BaseSchema<TInput, TOutput, TIssue>,
  input: unknown,
): { ok: true; data: TOutput } | { ok: false; issues: TIssue[] } {
  const result = safeParse(schema, input);
  if (!result.success) {
    return { ok: false, issues: result.issues as TIssue[] };
  }
  return { ok: true, data: result.output };
}
