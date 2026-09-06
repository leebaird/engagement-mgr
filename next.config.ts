import { networkInterfaces } from 'node:os';
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

if (process.env.NODE_ENV === 'production') {
  securityHeaders.unshift({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  });
}

function allowedDevOriginsFromEnv(): string[] {
  return (process.env.ALLOWED_DEV_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function lanIPv4Addresses(): string[] {
  const addresses = new Set<string>();
  for (const addrs of Object.values(networkInterfaces())) {
    for (const net of addrs ?? []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.add(net.address);
      }
    }
  }
  return [...addresses];
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  serverExternalPackages: ['pdfkit', 'sharp'],
  outputFileTracingIncludes: { '/api/reports/*': ['./assets/fonts/**/*'], '/dashboard/reports': ['./assets/fonts/**/*'] },
  // Dev-only: this machine's LAN IPs plus optional ALLOWED_DEV_ORIGINS (hostnames).
  allowedDevOrigins: [...new Set([...lanIPv4Addresses(), ...allowedDevOriginsFromEnv()])],
  experimental: {
    optimizePackageImports: ['lucide-react'],
    useTypeScriptCli: true,
    // Next applies this to every Server Action (including login). 25 MB covers
    // four 5 MB evidence images plus form fields; it cannot be set per action.
    serverActions: { bodySizeLimit: '25mb' },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
