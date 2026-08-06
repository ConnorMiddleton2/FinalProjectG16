import type { NextConfig } from "next";

const nextConfig: NextConfig = {
<<<<<<< HEAD
  // Cursor / Simple Browser often hits 127.0.0.1 while `next dev` binds to localhost
  allowedDevOrigins: ["127.0.0.1"],
=======
  // Chrome sometimes resolves localhost to 127.0.0.1, which Next treats as a
  // different origin and blocks JS/HMR assets unless we allow it here.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
>>>>>>> origin/main
};

export default nextConfig;
