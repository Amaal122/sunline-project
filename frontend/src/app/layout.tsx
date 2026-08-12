import type { Metadata } from "next";
import "./globals.css";
import { AppStateProvider } from "@/context/AppStateContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "SUNLINE - Premium Denim, Made in Tunisia",
  description:
    "Premium jeans designed for women who move with confidence. Made in Tunisia.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppStateProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </AppStateProvider>
      </body>
    </html>
  );
}
