import { z } from "zod";

/** Shared, isomorphic schemas. The server re-validates everything. */

export const EMAIL = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Enter your email address.")
  .max(254, "That email address is too long.")
  .email("Enter a valid email address.");

export const newsletterSchema = z.object({
  email: EMAIL,
  consent: z.literal("yes", { message: "Please confirm you would like to receive our letters." }),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().max(0).optional().default(""),
});

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(120),
  email: EMAIL,
  topic: z.enum(["order", "product", "press", "other"], { message: "Choose a topic." }),
  message: z
    .string()
    .trim()
    .min(10, "Your message is a little short.")
    .max(4000, "Please keep it under 4,000 characters."),
  website: z.string().max(0).optional().default(""),
});

export type FieldErrors = Partial<Record<string, string>>;

export type FormResult =
  { ok: true; message: string } | { ok: false; message: string; fieldErrors?: FieldErrors };

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
