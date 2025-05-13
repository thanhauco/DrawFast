
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
        '@opentelemetry/resources',
        '@opentelemetry/semantic-conventions',
        'genkit',
        '@opentelemetry/instrumentation',
        '@opentelemetry/exporter-trace-otlp-http',
        '@opentelemetry/context-async-hooks',
    ],
  },
  webpack: (config, { isServer }) => {
    // Add this rule to handle 'async_hooks' specifically for client builds
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}), // Spread existing fallback if any
        async_hooks: false, // Provide a fallback for async_hooks on the client
      };
    }
    // Important: return the modified config
    return config;
  },
};

export default nextConfig;
