import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { connection } from "next/server";
import { headers } from "next/headers";
import { getHighlightColor } from '@/lib/application-settings';
import { highlightColorCssName } from '@/lib/highlight-color';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Engagement Manager",
  description: "Secure operations and engagement tracking.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Dynamic rendering required for per-request CSP nonces (proxy sets x-nonce)
  await connection();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const highlightColor = await getHighlightColor();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      data-highlight-color={highlightColorCssName(highlightColor)}
    >
      <body data-nonce={nonce}>
        {children}
        <div id="modal-root" />
      </body>
    </html>
  );
}
