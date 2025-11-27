/** @type {import('next').NextConfig} */
const nextConfig = {
  // reactCompiler: true,
  cacheComponents: true,
  rewrites: {
    source: "/static/video/:path*",
    destination: "http://34.54.210.192/video/:path*",
  },
};

export default nextConfig;
