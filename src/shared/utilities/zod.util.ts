import { z } from 'zod';

/**
 * Helper to make a schema optional or required based on flag
 */
function wrapOptional<T extends z.ZodTypeAny, R extends boolean>(
  schema: T,
  required: R,
): R extends true ? T : z.ZodOptional<T> {
  return (required ? schema : schema.optional()) as any;
}

// ==================== Main Field Builder ====================
export const Field = {
  /** String field */
  string: <R extends boolean = false>(
    opts: { required?: R; default?: string; min?: number; max?: number } = {},
  ) => {
    let schema = z.string({ error: 'This field is required' });

    if (opts.min !== undefined) schema = schema.min(opts.min);
    if (opts.max !== undefined) schema = schema.max(opts.max);

    const finalSchema = opts.default !== undefined ? schema.default(opts.default) : schema;
    return wrapOptional(finalSchema, (opts.required ?? false) as R);
  },

  /** Number field */
  number: <R extends boolean = false>(
    opts: { required?: R; default?: number; min?: number; max?: number } = {},
  ) => {
    let schema = z.number({ error: 'This field is required' }).int();

    if (opts.min !== undefined) schema = schema.min(opts.min);
    if (opts.max !== undefined) schema = schema.max(opts.max);

    const finalSchema = opts.default !== undefined ? schema.default(opts.default) : schema;

    return wrapOptional(finalSchema, (opts.required ?? false) as R);
  },

  /** Boolean */
  boolean: <R extends boolean = false>(opts: { required?: R; default?: boolean } = {}) => {
    const schema = z.boolean();
    const finalSchema = opts.default !== undefined ? schema.default(opts.default) : schema;

    return wrapOptional(finalSchema, (opts.required ?? false) as R);
  },

  /** Date */
  date: <R extends boolean = false>(opts: { required?: R } = {}) =>
    wrapOptional(z.date({ error: 'Invalid date format' }), (opts.required ?? false) as R),

  /** UUID */
  uuid: <R extends boolean = false>(opts: { required?: R } = {}) =>
    wrapOptional(z.uuid('Invalid UUID format'), (opts.required ?? false) as R),

  /** Email */
  email: <R extends boolean = false>(opts: { required?: R } = {}) =>
    wrapOptional(z.email('Invalid email address'), (opts.required ?? false) as R),

  /** Enum */
  enum: <T extends readonly [string, ...string[]], R extends boolean = false>(
    values: T,
    opts: { required?: R; default?: T[number] } = {},
  ) => {
    const schema = z.enum(values);
    const finalSchema = opts.default !== undefined ? schema.default(opts.default) : schema;

    return wrapOptional(finalSchema, (opts.required ?? false) as R);
  },

  /** Array */
  array: <T extends z.ZodTypeAny, R extends boolean = false>(
    item: T,
    opts: { required?: R; min?: number } = {},
  ) => {
    const schema = z.array(item).min(opts.min ?? 0);
    return wrapOptional(schema, (opts.required ?? false) as R);
  },

  /** Nested DTO (single object) */
  dto: <T extends z.ZodRawShape, R extends boolean = false>(
    shape: T,
    opts: { required?: R } = {},
  ) => {
    const schema = z.object(shape).strict();
    return wrapOptional(schema, (opts.required ?? false) as R);
  },

  /** Nested DTO Array */
  dtoArray: <T extends z.ZodRawShape, R extends boolean = false>(
    shape: T,
    opts: { required?: R; min?: number } = {},
  ) => {
    const schema = z.array(z.object(shape).strict()).min(opts.min ?? 0);
    return wrapOptional(schema, (opts.required ?? false) as R);
  },

  /** File upload */
  file: () => z.any().optional(),
};

export { z };
