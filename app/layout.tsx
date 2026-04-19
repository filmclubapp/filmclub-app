import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./lib/auth-context";
import PostHogProvider from "./components/PostHogProvider";

export const metadata: Metadata = {
  title: "Film Club — The Social Home of Film",
  description:
    "For people who feel things watching films. Log it. Rate it. Debate it. Share it.",
  manifest: "/manifest.json",
  themeColor: "#FF4A4A",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Film Club",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=DM+Mono:wght@300;400&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF4A4A" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen bg-cream text-navy antialiased">
        <AuthProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
