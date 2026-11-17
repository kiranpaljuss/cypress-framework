import { z } from 'zod';

/**
 * Response contracts for the Automation Exercise API.
 *
 * Objects are strict: an unexpected field fails validation, so the weekly CI run
 * flags any change to the API's response shape, not only to its values.
 */

const numericString = z.string().regex(/^\d+$/, 'expected a numeric string');

/** Returned by create, update, delete and login-verification endpoints, and by every error. */
export const messageResponseSchema = z.strictObject({
  responseCode: z.number().int(),
  message: z.string().min(1),
});

export const userSchema = z.strictObject({
  id: z.number().int().positive(),
  name: z.string(),
  email: z.email(),
  title: z.enum(['Mr', 'Mrs', 'Miss']),
  birth_day: numericString,
  birth_month: z.string(),
  birth_year: numericString,
  first_name: z.string(),
  last_name: z.string(),
  company: z.string(),
  address1: z.string(),
  address2: z.string(),
  country: z.string(),
  state: z.string(),
  city: z.string(),
  zipcode: z.string(),
});

/** Returned by `GET /getUserDetailByEmail` when the account exists. */
export const userDetailResponseSchema = z.strictObject({
  responseCode: z.literal(200),
  user: userSchema,
});

/** Schemas by the name used in feature files. */
export const apiSchemas = {
  message: messageResponseSchema,
  'user details': userDetailResponseSchema,
} as const;

export type ApiSchemaName = keyof typeof apiSchemas;
export type ApiUser = z.infer<typeof userSchema>;
export type ApiResponseBody = z.infer<typeof messageResponseSchema> | z.infer<typeof userDetailResponseSchema>;
