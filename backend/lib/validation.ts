import { ContactFormData } from "../types/api.types.ts";

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates the contact form data against business rules.
 *
 * Rules:
 * - Name: Required, max 100 chars
 * - Email: Required, valid format
 * - Message: Required, 10-1000 chars
 *
 * @param data - The contact form data to validate
 * @returns ValidationResult object containing isValid status and any error messages
 */
export function validateContactForm(data: ContactFormData): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.nombre || data.nombre.trim().length === 0) {
    errors.nombre = "Name is required";
  } else if (data.nombre.length > 100) {
    errors.nombre = "Name must be less than 100 characters";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.correo || !emailRegex.test(data.correo)) {
    errors.correo = "Valid email is required";
  }

  if (!data.mensaje || data.mensaje.trim().length === 0) {
    errors.mensaje = "Message is required";
  } else if (data.mensaje.length < 10) {
    errors.mensaje = "Message must be at least 10 characters";
  } else if (data.mensaje.length > 1000) {
    errors.mensaje = "Message must be less than 1000 characters";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Basic sanitization to remove HTML tags and scripts to prevent XSS.
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";
  return input
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "") // Remove scripts
    .replace(/<[^>]+>/g, "") // Remove HTML tags
    .trim();
}

/**
 * Sanitizes the entire contact form data object.
 * @param data - The contact form data
 * @returns New object with sanitized fields
 */
export function sanitizeContactFormData(
  data: ContactFormData,
): ContactFormData {
  return {
    nombre: sanitizeInput(data.nombre),
    correo: data.correo.trim().toLowerCase(), // Email doesn't need HTML stripping usually, but trimming is good
    mensaje: sanitizeInput(data.mensaje),
  };
}
