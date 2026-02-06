import {
  assertEquals,
  assertInstanceOf,
} from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  AppError,
  DatabaseError,
  EmailServiceError,
  ValidationError,
} from "../../../utils/errors.ts";

Deno.test("AppError should set message and status code correctly", () => {
  const error = new AppError("Something went wrong", 418);
  assertEquals(error.message, "Something went wrong");
  assertEquals(error.statusCode, 418);
  assertEquals(error.name, "AppError");
  assertInstanceOf(error, Error);
});

Deno.test("AppError should default to 500 status code", () => {
  const error = new AppError("Internal Error");
  assertEquals(error.statusCode, 500);
});

Deno.test("ValidationError should have 400 status code", () => {
  const error = new ValidationError("Invalid input");
  assertEquals(error.message, "Invalid input");
  assertEquals(error.statusCode, 400);
  assertEquals(error.name, "ValidationError");
  assertInstanceOf(error, AppError);
});

Deno.test("DatabaseError should have 500 status code", () => {
  const error = new DatabaseError("DB connection failed");
  assertEquals(error.message, "DB connection failed");
  assertEquals(error.statusCode, 500);
  assertEquals(error.name, "DatabaseError");
  assertInstanceOf(error, AppError);
});

Deno.test("EmailServiceError should have 500 status code", () => {
  const error = new EmailServiceError("Email failed");
  assertEquals(error.message, "Email failed");
  assertEquals(error.statusCode, 500);
  assertEquals(error.name, "EmailServiceError");
  assertInstanceOf(error, AppError);
});
