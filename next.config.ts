import type { NextConfig } from "next";

const isExport = process.env.NEXT_EXPORT === "true";

const nextConfig: NextConfig = {
    output: isExport ? "export" : undefined,

    // critical change
    assetPrefix: isExport ? "." : undefined,

    trailingSlash: true,

    images: {
        unoptimized: true,
    },
};

export default nextConfig;
