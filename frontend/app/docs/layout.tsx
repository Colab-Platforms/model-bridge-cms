import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ColabOne SDK — Documentation",
  description:
    "TypeScript SDK for the ColabOne AI Gateway. Access 150+ models through a single, unified API.",
  icons: {
    icon: "/colab_one_logo_2.png",
    shortcut: "/colab_one_logo_2.png",
    apple: "/colab_one_logo_2.png",
  },
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
