import type { Metadata } from "next";
import { Suspense } from "react";
import { ScrollToTop } from "../components/scroll-to-top";
import { ToastProvider } from "../components/ui/toast";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://qrave-six.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Qrave | The Restaurant Growth OS",
    template: "%s"
  },
  description:
    "Qrave is a QR-based restaurant growth OS for digital menus, table ordering, kitchen workflows, waiter calls, branches, customers, and WhatsApp engagement.",
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
