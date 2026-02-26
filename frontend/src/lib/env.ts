export function getApiUrl(): string {
  if (import.meta.env.PROD) {
    return import.meta.env.PUBLIC_API_URL || "https://api.codewithbotina.com";
  }

  return import.meta.env.PUBLIC_API_URL || "http://localhost:8000";
}

export function getSiteUrl(): string {
  if (import.meta.env.PROD) {
    return import.meta.env.PUBLIC_SITE_URL || "https://blog.codewithbotina.com";
  }

  return import.meta.env.PUBLIC_SITE_URL || "http://localhost:4321";
}

export function isProduction(): boolean {
  return Boolean(import.meta.env.PROD);
}

export function isDevelopment(): boolean {
  return Boolean(import.meta.env.DEV);
}
