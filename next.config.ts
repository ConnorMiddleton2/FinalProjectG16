import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cursor / Simple Browser often hits 127.0.0.1 while `next dev` binds to localhost
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
