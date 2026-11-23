import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lucide-react ships ~4k icon modules behind a single barrel file —
  // let the compiler rewrite `import { X } from "lucide-react"` to
  // direct imports so dev pages don't compile thousands of modules.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
