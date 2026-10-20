import { AuthProvider } from "@/components/session-provider";
import { SystemFeedback } from "@/components/system-feedback";
import { Suspense } from "react";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "School Portal",
  description: "A clear, connected workspace for your school community.",
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
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <AuthProvider>{children}<Suspense fallback={null}><SystemFeedback /></Suspense></AuthProvider>
      </body>
    </html>
  );
}
