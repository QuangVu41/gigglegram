/** @type {import('next').NextConfig} */
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig = {
  experimental: {
    proxyClientMaxBodySize: "150mb",
  },
  // reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  cacheComponents: true,
  async rewrites() {
    const GS_HOST = process.env.GS_HOST || "http://placeholder-gs";
    const STATIC_IMAGE_ASSETS_URL = process.env.STATIC_IMAGE_ASSETS_URL || "http://placeholder-img";
    const STATIC_VIDEO_ASSETS_URL = process.env.STATIC_VIDEO_ASSETS_URL || "http://placeholder-video";
    const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "http://placeholder-api";

    return [
      {
        source: "/raw/:path*",
        destination: `${GS_HOST}/input-video-st/:path*`,
      },
      {
        source: "/images/messages/:path*",
        destination: `${GS_HOST}/image-st/messages/:path*`,
      },
      {
        source: "/video/messages/:path*",
        destination: `${GS_HOST}/input-video-st/messages/:path*`,
      },
      {
        source: "/images/stories/:path*",
        destination: `${STATIC_IMAGE_ASSETS_URL}/:path*`,
      },
      {
        source: "/video/stories/:path*",
        destination: `${STATIC_VIDEO_ASSETS_URL}/:path*`,
      },
      {
        source: "/video/:path*",
        destination: `${STATIC_VIDEO_ASSETS_URL}/:path*`,
      },
      {
        source: "/images/:path*",
        destination: `${STATIC_IMAGE_ASSETS_URL}/:path*`,
      },
      {
        source: "/avatars/:path*",
        destination: `${STATIC_IMAGE_ASSETS_URL}/avatars/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${API_GATEWAY_URL}/api/:path*`,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
