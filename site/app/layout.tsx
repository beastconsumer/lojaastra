import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AstraSystems",
  description: "Portal AstraSystems em Next.js"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/legacy/styles.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
