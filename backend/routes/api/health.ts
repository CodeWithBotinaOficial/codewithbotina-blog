import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../middleware/cors.ts";

export const handler: Handlers = {
  GET(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);

    const response = new Response(
      JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });

    return response;
  },
};
