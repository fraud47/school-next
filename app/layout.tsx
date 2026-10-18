import { AuthProvider } from "@/components/session-provider";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SchoolSpace | School management",
  description: "A clear, connected workspace for your school community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
