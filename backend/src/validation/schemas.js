import { z } from "zod";
import {
  PRIORITY_REASONS,
  TOKEN_PRIORITIES,
  TOKEN_STATUS,
  USER_ROLES,
} from "../config/constants.js";

const objectIdSchema = z.object({
  tokenId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid token id."),
});

export const createTokenSchema = {
  body: z
    .object({
      name: z.string().trim().min(2).max(120),
      phone: z
        .string()
        .trim()
        .regex(/^[0-9+()\-\s]{8,20}$/, "Invalid phone number format."),
      isPriority: z.boolean().default(false),
      priorityReason: z.enum(PRIORITY_REASONS).nullable().optional(),
      priority: z.enum(TOKEN_PRIORITIES).optional(),
      includeQr: z.boolean().optional(),
      deviceId: z.string().min(1).max(120).optional(),
    })
    .superRefine((payload, context) => {
      if (payload.isPriority && !payload.priorityReason) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["priorityReason"],
          message: "Priority reason is required when priority is enabled.",
        });
      }

      if (!payload.isPriority && payload.priorityReason) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["priorityReason"],
          message: "Priority reason is allowed only for priority tokens.",
        });
      }
    }),
};

export const tokenNumberParamSchema = {
  params: z.object({
    tokenNumber: z.string().regex(/^\d+$/, "Invalid token number."),
  }),
};

export const tokenStatusSchema = {
  params: objectIdSchema,
  body: z.object({
    status: z.enum([TOKEN_STATUS.COMPLETED, TOKEN_STATUS.SKIPPED]),
  }),
};

export const prioritizeTokenSchema = {
  params: objectIdSchema,
  body: z.object({
    boost: z.coerce.number().int().min(1).max(10).default(2),
  }),
};

export const queueFlowSchema = {
  body: z
    .object({
      averageServiceMinutes: z.coerce.number().int().min(1).max(60).optional(),
      maxPriorityStreak: z.coerce.number().int().min(1).max(10).optional(),
      maxPriorityShare: z.coerce.number().min(0.3).max(0.95).optional(),
      priorityWeight: z.coerce.number().min(0.8).max(3).optional(),
      starvationThresholdMinutes: z.coerce
        .number()
        .int()
        .min(2)
        .max(120)
        .optional(),
      nearTurnThreshold: z.coerce.number().int().min(1).max(20).optional(),
      activeCounters: z.coerce.number().int().min(1).max(20).optional(),
      enableDynamicReordering: z.boolean().optional(),
      autoServeNext: z.boolean().optional(),
      historicalSampleSize: z.coerce
        .number()
        .int()
        .min(25)
        .max(1000)
        .optional(),
      cacheTtlMs: z.coerce.number().int().min(250).max(15000).optional(),
    })
    .refine((payload) => Object.keys(payload).length > 0, {
      message: "At least one configuration value is required.",
    }),
};

export const paginationQuerySchema = {
  query: z.object({
    limit: z.coerce.number().int().min(1).max(500).default(100),
    eventType: z.string().optional(),
  }),
};

export const authRegisterSchema = {
  body: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(6).max(128),
    role: z.enum([USER_ROLES.ADMIN, USER_ROLES.USER]).optional(),
  }),
};

export const authLoginSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6).max(128),
  }),
};
