import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
    ],
  },

  env: {
    API_URL: process.env.API_URL,
    SSL_CERT: process.env.SSL_CERT,
    SSL_KEY: process.env.SSL_KEY,
  },

  // rewrite INTERNO (sem https://localhost:8081)
  async rewrites() {
    return [
      {
        source: "/projects/:user/:project/presence",
        destination: "/api-gateway/projects/:user/:project/presence",
      },
    ];
  },
};

export default nextConfig;
