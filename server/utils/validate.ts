import { safeParse, type BaseSchema } from "valibot";

export function parseSchema<TSchema extends BaseSchema>(
  schema: TSchema,
  input: unknown,
) {
  const result = safeParse(schema, input);
  if (!result.success) {
    return { ok: false as const, issues: result.issues };
  }
  return { ok: true as const, data: result.output };
}
