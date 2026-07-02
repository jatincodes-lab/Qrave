import type { Metadata } from "next";
import { Suspense } from "react";
import { ScrollToTop } from "../components/scroll-to-top";
import { ToastProvider } from "../components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://qrave.app"),
  title: {
    default: "Qrave | QR Menu Ordering Software",
    template: "%s"
  },
  description: "Qrave is QR menu ordering and customer CRM software for restaurants, cafes, cloud kitchens, and food service teams.",
  applicationName: "Qrave",
  authors: [{ name: "Qrave" }],
  creator: "Qrave",
  publisher: "Qrave",
  icons: {
    icon: [{ url: "/brand/qrave-icon-mark-transparent.png", type: "image/png" }],
    shortcut: "/brand/qrave-icon-mark-transparent.png",
    apple: "/brand/qrave-icon-mark.png"
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
