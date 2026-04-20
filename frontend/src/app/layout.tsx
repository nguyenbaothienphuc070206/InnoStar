import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from "./components/error-boundary";

export const metadata: Metadata = {
  title: "GreenPark AI",
  description: "Smart green parking and eco-travel assistant for Ho Chi Minh City"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary fallback={<div style={{ padding: "2rem", color: "#fff" }}>Something went wrong</div>}>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
