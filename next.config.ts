import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Chrome sometimes resolves localhost to 127.0.0.1, which Next treats as a
  // different origin and blocks JS/HMR assets unless we allow it here.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
