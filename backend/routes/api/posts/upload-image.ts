import { Handlers } from "$fresh/server.ts";
import { ImageService } from "../../../services/image.service.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { requireAdmin } from "../../../middleware/auth.ts";
import { AppError } from "../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";

const imageService = new ImageService();

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  },

  async POST(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);

    try {
      await requireAdmin(req);
      const formData = await req.formData();
      const file = formData.get("image");
      const title = formData.get("title");
      const slug = formData.get("slug");

      if (!(file instanceof File)) {
        const response = errorResponse("Image file is required", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      if (typeof title !== "string" || typeof slug !== "string") {
        const response = errorResponse("Image title and slug are required", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const result = await imageService.uploadImage(file, title, slug);
      const response = successResponse(
        {
          url: result.url,
          filename: result.filename,
          size: result.size,
        },
        "Image uploaded successfully",
        201,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      const response = errorResponse(
        error instanceof Error ? error.message : "Internal server error",
        statusCode,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};
