import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ModelBridge SDK — Documentation",
  description:
    "TypeScript SDK for the ModelBridge AI Gateway. Access 150+ models through a single, unified API.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
