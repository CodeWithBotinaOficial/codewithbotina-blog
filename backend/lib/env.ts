export function getEnvironmentConfig() {
  const isProduction = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;

  return {
    isProduction,
    isDevelopment: !isProduction,
    frontendUrl: Deno.env.get("FRONTEND_URL") ||
      (isProduction
        ? "https://blog.codewithbotina.com"
        : "http://localhost:4321"),
    allowedOrigin: Deno.env.get("ALLOWED_ORIGIN") ||
      (isProduction
        ? "https://blog.codewithbotina.com"
        : "http://localhost:4321"),
    supabaseUrl: Deno.env.get("SUPABASE_URL") ||
      (isProduction
        ? "https://fnxnsgtdbswvuqeuvgio.supabase.co"
        : "http://localhost:54321"),
  };
}
