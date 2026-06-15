import type { NextConfig } from "next";

const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function normalizeBackendOrigin(value: string | undefined) {
  const origin = value?.trim().replace(/\/+$|\/+(?=\?)/, "") ?? "";
  if (!origin) return "";

  try {
    const parsed = new URL(origin);
    return parsed.origin;
  } catch {
    return "";
  }
}

const backendOrigin = normalizeBackendOrigin(process.env.KTR_BACKEND_ORIGIN);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(allowedDevOrigins.length ? { allowedDevOrigins } : {}),
  async rewrites() {
    if (!backendOrigin) return [];

    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendOrigin}/api/v1/:path*`,
      },
      {
        source: "/healthz",
        destination: `${backendOrigin}/healthz`,
      },
      {
        source: "/assets/fonts/:path*",
        destination: `${backendOrigin}/assets/fonts/:path*`,
      },
    ];
  },
};

export default nextConfig;
