import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://colabone.ai"
  ),
  title: "ColabOne — Unified AI Gateway",
  description:
    "One API key. 150+ AI models. ColabOne gives you a single unified endpoint for OpenAI, Anthropic, Google, and more — with intelligent routing, failover, and real-time billing.",
  icons: {
    icon: "/colab_one_logo.png",
    shortcut: "/colab_one_logo.png",
    apple: "/colab_one_logo.png",
  },
  openGraph: {
    title: "ColabOne — Unified AI Gateway",
    description:
      "One API key. 150+ AI models. Access every top LLM through a single unified API.",
    images: ["/colab_one_logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
          <Providers>{children}</Providers>
        </body>
    </html>
  );
}
