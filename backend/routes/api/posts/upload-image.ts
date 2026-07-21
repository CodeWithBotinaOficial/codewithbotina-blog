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
    const requestId = crypto.randomUUID();
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);

    try {
      console.log(`[${requestId}] Image upload started`);
      await requireAdmin(req);

      console.log(`[${requestId}] Parsing upload FormData`);
      const formData = await req.formData();
      const file = formData.get("image") ?? formData.get("file");
      const titleValue = formData.get("title");
      const slugValue = formData.get("slug") ?? formData.get("postId");

      if (!(file instanceof File)) {
        console.error(`[${requestId}] Upload missing image file`);
        const response = errorResponse("Image file is required", 400, {
          requestId,
        });
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      if (file.size <= 0) {
        console.error(`[${requestId}] Upload received empty file`);
        const response = errorResponse("Image file is empty", 400, {
          requestId,
        });
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const title = typeof titleValue === "string" && titleValue.trim()
        ? titleValue
        : file.name.replace(/\.[^.]+$/, "") || "post-image";
      const slug = typeof slugValue === "string" && slugValue.trim()
        ? slugValue
        : "post-image";

      console.log(
        `[${requestId}] Upload file: ${file.name}, size: ${file.size}, type: ${file.type}`,
      );
      console.log(`[${requestId}] Upload target slug: ${slug}`);

      const result = await imageService.uploadImage(file, title, slug);
      console.log(`[${requestId}] Image upload successful: ${result.filename}`);

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
      const message = error instanceof Error
        ? error.message
        : "Internal server error";
      console.error(`[${requestId}] Image upload failed`, {
        statusCode,
        error: message,
      });
      const response = errorResponse(
        message,
        statusCode,
        { requestId },
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};
