import { networkInterfaces } from 'node:os';

/** Non-loopback IPv4 addresses for Network: URLs and allowedDevOrigins. */
export function lanIPv4Addresses() {
  const addresses = [];
  for (const addrs of Object.values(networkInterfaces())) {
    for (const net of addrs ?? []) {
      if ((net.family === 'IPv4' || net.family === 4) && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return [...new Set(addresses)];
}
