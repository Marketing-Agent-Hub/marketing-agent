import { z } from 'zod';

export const sourceLangEnum = z.enum(['VI', 'EN', 'MIXED']);

export const createSourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  rssUrl: z.string().url('RSS URL must be a valid URL'),
  siteUrl: z.string().url('Site URL must be a valid URL').optional(),
  lang: sourceLangEnum.default('MIXED'),
  topicTags: z.array(z.string()).default([]),
  trustScore: z.number().int().min(0).max(100).default(70),
  enabled: z.boolean().default(false),
  fetchIntervalMinutes: z.number().int().min(5).max(1440).default(60),
  denyKeywords: z.array(z.string()).default([]),
  notes: z.string().max(1000).optional(),
});

export const updateSourceSchema = createSourceSchema.partial();

export const validateRSSSchema = z.object({
  url: z.string().url('URL must be a valid URL'),
});

export type CreateSourceInput = z.infer<typeof createSourceSchema>;
export type UpdateSourceInput = z.infer<typeof updateSourceSchema>;
export type ValidateRSSInput = z.infer<typeof validateRSSSchema>;
