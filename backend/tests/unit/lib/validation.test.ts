import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  sanitizeContactFormData,
  sanitizeInput,
  validateContactForm,
} from "../../../lib/validation.ts";
import {
  invalidContactData,
  validContactData,
} from "../../fixtures/testData.ts";

Deno.test("validateContactForm accepts valid data", () => {
  const result = validateContactForm(validContactData);
  assertEquals(result.isValid, true);
  assertEquals(Object.keys(result.errors).length, 0);
});

Deno.test("validateContactForm rejects missing name", () => {
  const result = validateContactForm(invalidContactData.missingName);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.nombre, "Name is required");
});

Deno.test("validateContactForm rejects invalid email", () => {
  const result = validateContactForm(invalidContactData.invalidEmail);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.correo, "Valid email is required");
});

Deno.test("validateContactForm rejects short message", () => {
  const result = validateContactForm(invalidContactData.shortMessage);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.mensaje, "Message must be at least 10 characters");
});

Deno.test("validateContactForm rejects long name", () => {
  const result = validateContactForm(invalidContactData.longName);
  assertEquals(result.isValid, false);
  assertEquals(result.errors.nombre, "Name must be less than 100 characters");
});

Deno.test("sanitizeInput removes HTML tags", () => {
  const input = "<script>alert('xss')</script>Hello <b>World</b>";
  const sanitized = sanitizeInput(input);
  assertEquals(sanitized, "Hello World");
});

Deno.test("sanitizeContactFormData sanitizes all fields", () => {
  const dirtyData = {
    nombre: "<b>John</b>",
    correo: "  TEST@Example.com  ",
    mensaje: "<script>bad</script>Message",
  };

  const cleanData = sanitizeContactFormData(dirtyData);

  assertEquals(cleanData.nombre, "John");
  assertEquals(cleanData.correo, "test@example.com");
  assertEquals(cleanData.mensaje, "Message");
});
