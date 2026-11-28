/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // AVIF first (much smaller for the phone screenshots), WebP for browsers without it.
    formats: ['image/avif', 'image/webp'],
    // 60 for the app screenshots (SHOT_QUALITY), 75 (the default) for everything else.
    qualities: [60, 75],
    // Files in public/ are served with max-age=0, so without this Vercel would re-optimize them every minute.
    minimumCacheTTL: 2678400,
    // Default sizes plus 480, which fits the ~280px phone screenshots on 1.75x screens better than 640.
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 480],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.brandfetch.io',
      },
    ],
  },
};

export default nextConfig;
