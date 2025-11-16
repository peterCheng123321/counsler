/**
 * Canvas Data Validation Schemas
 * Validates student and essay data with comprehensive rules
 */

import { z } from "zod";

/**
 * Email validation (RFC 5322 compliant)
 */
const emailSchema = z
  .string()
  .email("Please enter a valid email address")
  .min(5, "Email must be at least 5 characters")
  .max(254, "Email must not exceed 254 characters");

/**
 * Phone validation (E.164 international format)
 * Supports formats: +1234567890, +12345678901234
 */
const phoneSchema = z
  .string()
  .regex(
    /^\+?[1-9]\d{1,14}$/,
    "Please enter a valid phone number (e.g., +1234567890)"
  )
  .optional()
  .or(z.literal(""));

/**
 * GPA validation
 * Supports both weighted (0.0-5.0) and unweighted (0.0-4.0)
 */
const gpaSchema = z
  .number()
  .min(0, "GPA cannot be negative")
  .max(5.0, "GPA cannot exceed 5.0")
  .refine(
    (val) => {
      // Check for reasonable precision (max 2 decimal places)
      return (val * 100) % 1 === 0;
    },
    { message: "GPA should have at most 2 decimal places" }
  );

/**
 * SAT score validation (400-1600)
 * Total score range based on current SAT format
 */
const satScoreSchema = z
  .number()
  .int("SAT score must be a whole number")
  .min(400, "SAT score must be at least 400")
  .max(1600, "SAT score cannot exceed 1600")
  .refine(
    (val) => val % 10 === 0,
    { message: "SAT scores are typically multiples of 10" }
  )
  .optional()
  .or(z.literal(0)); // 0 means not taken

/**
 * ACT score validation (1-36)
 */
const actScoreSchema = z
  .number()
  .int("ACT score must be a whole number")
  .min(1, "ACT score must be at least 1")
  .max(36, "ACT score cannot exceed 36")
  .optional()
  .or(z.literal(0)); // 0 means not taken

/**
 * Class rank validation
 */
const classRankSchema = z
  .number()
  .int("Class rank must be a whole number")
  .positive("Class rank must be positive")
  .optional();

/**
 * Graduation year validation
 */
const graduationYearSchema = z
  .number()
  .int("Graduation year must be a whole number")
  .min(new Date().getFullYear(), "Graduation year cannot be in the past")
  .max(
    new Date().getFullYear() + 10,
    "Graduation year seems too far in the future"
  );

/**
 * Student Edit Schema
 * Used for validating student profile updates in canvas
 */
export const studentEditSchema = z.object({
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must not exceed 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "First name can only contain letters, spaces, hyphens, and apostrophes"),

  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must not exceed 50 characters")
    .regex(/^[a-zA-Z\s'-]+$/, "Last name can only contain letters, spaces, hyphens, and apostrophes"),

  email: emailSchema,

  phone: phoneSchema,

  gpa_unweighted: gpaSchema.optional().or(z.literal(0)),

  gpa_weighted: gpaSchema.optional().or(z.literal(0)),

  sat_score: satScoreSchema,

  act_score: actScoreSchema,

  class_rank: classRankSchema,

  class_size: z
    .number()
    .int("Class size must be a whole number")
    .positive("Class size must be positive")
    .optional(),

  graduation_year: graduationYearSchema.optional(),
});

/**
 * Type for student edit data
 */
export type StudentEditData = z.infer<typeof studentEditSchema>;

/**
 * Essay Edit Schema
 * Used for validating essay updates in canvas
 */
export const essayEditSchema = z.object({
  title: z
    .string()
    .min(1, "Essay title is required")
    .max(200, "Essay title must not exceed 200 characters"),

  content: z
    .string()
    .max(10000, "Essay content must not exceed 10,000 characters"),

  prompt: z.string().optional(),

  status: z.enum(["draft", "in_review", "completed"], {
    errorMap: () => ({ message: "Status must be draft, in_review, or completed" }),
  }).optional(),

  feedback: z
    .string()
    .max(2000, "Feedback must not exceed 2,000 characters")
    .optional(),
});

/**
 * Type for essay edit data
 */
export type EssayEditData = z.infer<typeof essayEditSchema>;

/**
 * Validate data and return typed errors
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with {success, data, errors}
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  success: boolean;
  data?: T;
  errors?: Record<string, string>;
} {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  // Format Zod errors into field-level error messages
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join(".");
    errors[path] = err.message;
  });

  return {
    success: false,
    errors,
  };
}

/**
 * Validate student edit data
 */
export function validateStudentEdit(data: unknown) {
  return validateData(studentEditSchema, data);
}

/**
 * Validate essay edit data
 */
export function validateEssayEdit(data: unknown) {
  return validateData(essayEditSchema, data);
}

/**
 * Format validation errors for display
 *
 * @param errors - Error object from validation
 * @returns Array of error messages
 */
export function formatValidationErrors(
  errors?: Record<string, string>
): string[] {
  if (!errors) return [];
  return Object.values(errors);
}

/**
 * Check if field has error
 *
 * @param errors - Error object from validation
 * @param fieldName - Field to check
 * @returns true if field has error
 */
export function hasFieldError(
  errors: Record<string, string> | undefined,
  fieldName: string
): boolean {
  return Boolean(errors && errors[fieldName]);
}

/**
 * Get error message for field
 *
 * @param errors - Error object from validation
 * @param fieldName - Field to get error for
 * @returns Error message or undefined
 */
export function getFieldError(
  errors: Record<string, string> | undefined,
  fieldName: string
): string | undefined {
  return errors?.[fieldName];
}

/**
 * Word count validation for essays
 */
export function validateWordCount(
  content: string,
  minWords: number = 0,
  maxWords: number = 1000
): { isValid: boolean; wordCount: number; message?: string } {
  const words = content.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < minWords) {
    return {
      isValid: false,
      wordCount,
      message: `Essay must be at least ${minWords} words (currently ${wordCount})`,
    };
  }

  if (wordCount > maxWords) {
    return {
      isValid: false,
      wordCount,
      message: `Essay must not exceed ${maxWords} words (currently ${wordCount})`,
    };
  }

  return {
    isValid: true,
    wordCount,
  };
}

/**
 * Common App essay word count validation (650 words max)
 */
export function validateCommonAppEssay(content: string) {
  return validateWordCount(content, 250, 650);
}

/**
 * Supplemental essay word count validation (varies by prompt)
 */
export function validateSupplementalEssay(
  content: string,
  maxWords: number = 300
) {
  return validateWordCount(content, 50, maxWords);
}
