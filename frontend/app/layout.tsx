import { Inter, Indie_Flower } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import ReactQueryProvider from "@/components/query-client";
import { Metadata } from "next";
import { SessionProvider } from "@/providers/session-provider";
import { ThemeProvider } from "@/providers/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const indieFlower = Indie_Flower({
  weight: "400",
  variable: "--font-indie-flower",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PictuRAS",
  description: "Your personal, intuitive and powerful image editor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${indieFlower.variable} antialiased font-body`}
      >
        <ThemeProvider>
        <ReactQueryProvider>
          <SessionProvider>
            {children}
            <Toaster />
          </SessionProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </ReactQueryProvider>
      </ThemeProvider>
      </body>
    </html>
  );
}
