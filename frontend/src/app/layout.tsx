import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GreenPark AI",
  description: "Smart green parking and eco-travel assistant for Ho Chi Minh City"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
