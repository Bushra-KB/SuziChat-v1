import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ExoClickProvider } from "@/components/ads/exoclick-provider";

export const metadata: Metadata = {
  title: "Suzi Chat",
  description: "Web-first social community platform preview",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  // ExoClick site-ownership verification for suzichat.com.
  other: {
    "6a97888e-site-verification": "2777a086c02ef9e817d4daadc2f953b3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
        <ExoClickProvider />
      </body>
    </html>
  );
}
