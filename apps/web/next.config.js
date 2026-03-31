/** @type {import('next').NextConfig} */
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig = {
  // reactCompiler: true,
  cacheComponents: true,
  async rewrites() {
    return [
      {
        source: "/video/:path*",
        destination: `${process.env.STATIC_VIDEO_ASSETS_URL}/:path*`,
      },
      {
        source: "/images/:path*",
        destination: `${process.env.STATIC_IMAGE_ASSETS_URL}/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${process.env.API_GATEWAY_URL}/api/:path*`,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
