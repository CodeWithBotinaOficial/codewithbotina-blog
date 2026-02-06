import { ApiResponse } from "../types/api.types.ts";

export function successResponse<T>(
  data: T,
  message: string = "Success",
  statusCode: number = 200,
): Response {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function errorResponse(
  message: string,
  statusCode: number = 500,
  details?: Record<string, string>,
): Response {
  const body: ApiResponse<null> = {
    success: false,
    error: message,
    details,
  };
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
