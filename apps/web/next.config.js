/** @type {import('next').NextConfig} */
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig = {
  // reactCompiler: true,
  cacheComponents: true,
  async rewrites() {
    return [
      {
        source: "/static/video/:path*",
        destination: `${process.env.STATIC_ASSETS_URL}/video/:path*`,
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
