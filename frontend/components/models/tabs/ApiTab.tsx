"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import { cn } from "@/lib/utils";
import type { Model } from "@/types/index";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ApiTabProps {
  model: Model;
  apiKeyPrefix: string | null;
}

function buildSnippet(
  type: "standard" | "streaming",
  language: "typescript" | "javascript",
  modelSlug: string,
  apiKey: string
): string {
  const keyValue = apiKey;
  const importLine =
    language === "typescript"
      ? `import ModelBridge from '@model-bridge/sdk';`
      : `const ModelBridge = require('@model-bridge/sdk');`;

  if (type === "standard") {
    return `${importLine}

const client = new ModelBridge({
  apiKey: '${keyValue}',
});

const response = await client.chat.completions.create({
  model: '${modelSlug}',
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(response.choices[0].message.content);`;
  }

  return `${importLine}

const client = new ModelBridge({
  apiKey: '${keyValue}',
});

const stream = await client.chat.completions.create({
  model: '${modelSlug}',
  messages: [{ role: 'user', content: 'Hello!' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? '');
}`;
}

function CodeBlock({
  label,
  snippet,
  language,
}: {
  label: string;
  snippet: string;
  language: "typescript" | "javascript";
}) {
  return (
    <div className="flex flex-col gap-2">
      <Badge variant="secondary" className="w-fit">{label}</Badge>
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
            {language}
          </span>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white"
            onClick={() => {
              navigator.clipboard.writeText(snippet);
              toast.success("Copied to clipboard");
            }}
          >
            <Copy className="size-3.5" />
            Copy
          </button>
        </div>
        <Highlight code={snippet} language={language} theme={themes.oneDark}>
          {({ className, tokens, getLineProps, getTokenProps }) => (
            <pre className={cn(className, "overflow-x-auto bg-transparent! p-4 text-sm leading-relaxed")}>
              {tokens.map((line, i) => {
                const { key: lineKey, ...lineProps } = getLineProps({ line });
                return (
                  <div key={i} {...lineProps}>
                    {line.map((token, tokenIndex) => {
                      const { key: tokenKey, ...tokenProps } = getTokenProps({ token });
                      return <span key={tokenIndex} {...tokenProps} />;
                    })}
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}

export function ApiTab({ model, apiKeyPrefix }: ApiTabProps) {
  const [language, setLanguage] = useState<"typescript" | "javascript">(
    "typescript"
  );

  const keyValue = apiKeyPrefix ? `${apiKeyPrefix}...` : "YOUR_API_KEY";

  const standardSnippet = buildSnippet("standard", language, model.slug, keyValue);
  const streamingSnippet = buildSnippet("streaming", language, model.slug, keyValue);

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* API key pre-fill notice */}
      {apiKeyPrefix && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm dark:border-green-900 dark:bg-green-950">
          <Badge className="mt-0.5 shrink-0 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            Key pre-filled
          </Badge>
          <p className="text-muted-foreground">
            Your key prefix{" "}
            <code className="font-mono">{apiKeyPrefix}...</code> has been
            pre-filled above. Replace it with your full key.
          </p>
        </div>
      )}

      {/* Language toggle */}
      <div className="flex gap-2">
        <Button
          variant={language === "typescript" ? "default" : "outline"}
          size="sm"
          onClick={() => setLanguage("typescript")}
        >
          TypeScript
        </Button>
        <Button
          variant={language === "javascript" ? "default" : "outline"}
          size="sm"
          onClick={() => setLanguage("javascript")}
        >
          JavaScript
        </Button>
      </div>

      {/* Code blocks */}
      <div className="flex flex-col gap-6">
        <CodeBlock label="Standard" snippet={standardSnippet} language={language} />
        <CodeBlock label="Streaming" snippet={streamingSnippet} language={language} />
      </div>

      {/* Footer note */}
      <p className="text-sm text-muted-foreground">
        The <code className="font-mono">model</code> field is the exact slug
        for this model.{" "}
        <Link
          href="/dashboard/keys"
          className="text-foreground underline underline-offset-4 hover:no-underline"
        >
          Get your API key →
        </Link>
      </p>
    </div>
  );
}
