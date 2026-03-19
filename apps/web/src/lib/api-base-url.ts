export function getApiBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (envUrl) {
    return envUrl;
  }

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:4000";
    }

    return `${origin}/api`;
  }

  return "http://localhost:4000";
}
