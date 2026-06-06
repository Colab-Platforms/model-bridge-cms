"use client";

import { useState } from "react";
import { Copy, Check, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  apiKey: string;
  onDismiss: () => void;
}

export default function OneTimeKeyDisplay({ apiKey, onDismiss }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <p>
          <strong>This key will never be shown again.</strong> Copy it now before
          closing this window.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          value={apiKey}
          readOnly
          className="font-mono text-xs"
          onFocus={(e) => e.target.select()}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={copy}
          aria-label="Copy API key"
        >
          {copied ? (
            <Check className="size-4 text-green-600" />
          ) : (
            <Copy className="size-4" />
          )}
        </Button>
      </div>

      <Button onClick={onDismiss} className="w-full">
        I&apos;ve saved my key — Done
      </Button>
    </div>
  );
}
