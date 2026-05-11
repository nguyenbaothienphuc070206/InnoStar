import type { Metadata } from "next";
import "./globals.css";
import ErrorBoundary from "./components/error-boundary";
import { JourneyProvider } from "./components/JourneyContext";

export const metadata: Metadata = {
  title: "SaigonGreen",
  description: "Smart green parking and eco-travel assistant for Ho Chi Minh City"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <JourneyProvider>
          <ErrorBoundary fallback={<div style={{ padding: "2rem", color: "#fff" }}>Something went wrong</div>}>
            {children}
          </ErrorBoundary>
        </JourneyProvider>
      </body>
    </html>
  );
}
