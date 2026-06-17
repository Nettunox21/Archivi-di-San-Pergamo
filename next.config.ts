import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Ensure static files in /public and /content are bundled correctly on Vercel
    // Images from /public are served by Vercel's CDN automatically
    images: {
        // Allow images served from the same origin (avatars, logo, etc.)
        unoptimized: false,
    },
};

export default nextConfig;
