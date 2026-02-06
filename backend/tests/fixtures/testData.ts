import { ContactFormData } from "../../types/api.types.ts";

export const validContactData: ContactFormData = {
  nombre: "Test User",
  correo: "test@example.com",
  mensaje: "This is a valid test message that meets the length requirements.",
};

export const invalidContactData = {
  missingName: {
    correo: "test@example.com",
    mensaje: "This is a valid test message.",
  } as ContactFormData,

  invalidEmail: {
    nombre: "Test User",
    correo: "invalid-email",
    mensaje: "This is a valid test message.",
  } as ContactFormData,

  shortMessage: {
    nombre: "Test User",
    correo: "test@example.com",
    mensaje: "Short",
  } as ContactFormData,

  longName: {
    nombre: "A".repeat(101),
    correo: "test@example.com",
    mensaje: "This is a valid test message.",
  } as ContactFormData,
};
