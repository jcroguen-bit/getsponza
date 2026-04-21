import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GetSponza — Land Your First Brand Deal",
  description: "Paste your channel URL. We'll build your complete sponsorship kit — media kit, pitch emails, and 20+ matched brands — in under 2 minutes.",
  openGraph: {
    title: "GetSponza — Land Your First Brand Deal",
    description: "Get your free Sponsorship Readiness Score. No account needed.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          src="https://phospho-nanocorp-prod--nanocorp-api-fastapi-app.modal.run/beacon/snippet.js?s=sponza"
          defer
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
