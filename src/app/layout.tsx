import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team OZE",
  description: "Legion TD games, events, community, and W3Champions resources from Team OZE."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
