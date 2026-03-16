import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Suzi Chat",
  description: "Web-first social community platform preview",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
