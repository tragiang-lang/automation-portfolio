import { z } from "zod";
import { colorTokens, CONFIG_KEY, VERSIONED_ID } from "./assets";

/**
 * The client brief: the only client-specific input the factory takes.
 * Holds business facts and non-secret settings. Tokens, channel secrets
 * and spreadsheet ids are Script Properties set at deploy time and must
 * never appear here (QA scans the brief for them).
 */
export const clientBrief = z.object({
  schemaVersion: z.literal(1),
  project: z.object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case"),
    clientName: z.string().min(1),
    year: z.number().int().min(2024).max(2100),
    /** Fixed date for reproducible output. Defaults to today when omitted. */
    createdOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  industry: z.string().regex(/^[a-z][a-z0-9_]*$/),
  businessType: z.string().optional(),
  /** Free-text requirement lines, e.g. "Customer should be able to see menu". */
  requirements: z.array(z.string().min(1)).default([]),
  /** Explicit intent ids (customer-intents catalog), merged with those detected in `requirements`. */
  intents: z.array(z.string()).default([]),
  existingResources: z.array(z.string()).default([]),
  brand: z.object({
    name: z.string().min(1),
    preset: z.string().regex(VERSIONED_ID).optional(),
    colors: colorTokens.partial().optional(),
    tone: z.string().optional(),
    logoAvailable: z.boolean().default(false),
  }),
  /** Non-secret CONFIG seed values and Rich Menu URI targets, keyed by config key. */
  config: z.record(z.string().regex(CONFIG_KEY), z.string()).default({}),
  overrides: z
    .object({
      richMenu: z.string().regex(VERSIONED_ID).optional(),
      workflows: z.array(z.string().regex(VERSIONED_ID)).optional(),
    })
    .default({}),
});
export type ClientBrief = z.infer<typeof clientBrief>;
