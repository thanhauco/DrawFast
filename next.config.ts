
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [
        '@opentelemetry/api',
        '@opentelemetry/sdk-trace-base',
        '@opentelemetry/sdk-trace-node',
        '@opentelemetry/context-async-hooks',
        '@opentelemetry/resources',
        '@opentelemetry/semantic-conventions',
        // Mark genkit as external as it might use Node-specific APIs like async_hooks via OTel
        'genkit', 
        // Any other OTel packages that might cause issues can be added here
    ],
  },
};

export default nextConfig;
