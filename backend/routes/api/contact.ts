import { Handlers } from "$fresh/server.ts";
import { ContactService } from "../../services/contact.service.ts";
import { ContactFormData } from "../../types/api.types.ts";
import { errorResponse, successResponse } from "../../utils/responses.ts";
import { ALLOWED_ORIGIN, corsHeaders } from "../../middleware/cors.ts";
import { AppError } from "../../utils/errors.ts";
import {
  sanitizeContactFormData,
  validateContactForm,
} from "../../lib/validation.ts";
import { isRateLimited } from "../../middleware/rateLimit.ts";

const contactService = new ContactService();

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  },

  async POST(req, ctx) {
    const origin = req.headers.get("Origin");

    let clientIp = "unknown";
    if (
      ctx.remoteAddr.transport === "tcp" || ctx.remoteAddr.transport === "udp"
    ) {
      clientIp = (ctx.remoteAddr as Deno.NetAddr).hostname;
    }

    // Rate Limiting
    if (isRateLimited(clientIp)) {
      const headers = corsHeaders(origin);
      const response = errorResponse("Too many requests", 429);
      headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Basic CORS check
    if (origin && origin !== ALLOWED_ORIGIN && !origin.includes("localhost")) {
      // In strict production we might return 403, but for now let's rely on the headers
      // to block the browser from reading the response.
    }

    let body;
    try {
      body = await req.json();
    } catch (_e) {
      const headers = corsHeaders(origin);
      const response = errorResponse("Invalid JSON body", 400);
      headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
      return response;
    }

    try {
      let contactData = body as ContactFormData;

      // Sanitize input
      contactData = sanitizeContactFormData(contactData);

      // Validate input
      const validation = validateContactForm(contactData);

      if (!validation.isValid) {
        const headers = corsHeaders(origin);
        const response = errorResponse(
          "Validation failed",
          400,
          validation.errors,
        );
        headers.forEach((value, key) => {
          response.headers.set(key, value);
        });
        return response;
      }

      const result = await contactService.processContactSubmission(contactData);

      const headers = corsHeaders(origin);

      if (result.success && result.data) {
        const response = successResponse(
          result.data,
          "Contact form submitted successfully",
          201,
        );
        // Merge CORS headers
        headers.forEach((value, key) => {
          response.headers.set(key, value);
        });
        return response;
      } else {
        const error = result.error;
        const statusCode = error instanceof AppError ? error.statusCode : 500;
        const response = errorResponse(
          error?.message || "Internal server error",
          statusCode,
        );
        headers.forEach((value, key) => {
          response.headers.set(key, value);
        });
        return response;
      }
    } catch (error) {
      console.error("API Error:", error);
      const headers = corsHeaders(origin);
      const response = errorResponse("Internal server error", 500);
      headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
      return response;
    }
  },
};
