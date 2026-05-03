import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { siteConfig } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/app-icon-light.png",
        sizes: "512x512",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/app-icon-dark.png",
        sizes: "512x512",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon-light.png",
        sizes: "180x180",
        type: "image/png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/apple-touch-icon-dark.png",
        sizes: "180x180",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F5FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1014" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full bg-background antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground safe-area-bottom">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
