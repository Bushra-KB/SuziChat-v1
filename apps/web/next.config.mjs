// The mobile (Capacitor) build is a static export pointed at the production API.
// The regular web deploy is unchanged unless BUILD_TARGET=mobile is set.
const isMobile = process.env.BUILD_TARGET === "mobile";

const apiProxyTarget =
  process.env.API_PROXY_TARGET?.trim() ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  "http://127.0.0.1:4000";

/** @type {import('next').NextConfig} */
const webConfig = {
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), display-capture=(self), geolocation=()",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

/** @type {import('next').NextConfig} */
const mobileConfig = {
  poweredByHeader: false,
  compress: true,
  // Emit a fully static bundle into `out/` for Capacitor to package.
  output: "export",
  // Resolve routes to folder/index.html so they load from the local app server.
  trailingSlash: true,
  // next/image's default loader needs a server; disable optimization for export.
  images: { unoptimized: true },
};

export default isMobile ? mobileConfig : webConfig;
