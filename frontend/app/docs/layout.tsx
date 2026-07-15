import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Colab-One SDK — Documentation",
  description:
    "TypeScript SDK for the Colab-One AI Gateway. Access 150+ models through a single, unified API.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
