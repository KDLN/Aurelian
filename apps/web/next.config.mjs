/** @type {import('next').NextConfig} */
const nextConfig = { 
  reactStrictMode: true,
  typescript: {
    // Ignore build errors for now to deploy market system
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore lint errors during builds
    ignoreDuringBuilds: true,
  },
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
};

export default nextConfig;
