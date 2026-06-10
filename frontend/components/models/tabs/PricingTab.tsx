"use client";

import { useState } from "react";
import type { Model } from "@/types/index";
import { formatPrice, estimateCost } from "@/lib/modelUtils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PricingTabProps {
  model: Model;
}

export function PricingTab({ model }: PricingTabProps) {
  const [promptTokens, setPromptTokens] = useState(0);
  const [completionTokens, setCompletionTokens] = useState(0);

  const isImageModel = model.defaultForCapabilities.includes("IMAGE");

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Section 1 — Pricing table */}
      <Card>
        <CardHeader>
          <CardTitle>Token Pricing</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          {isImageModel ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Per image</span>
              <span className="font-medium">
                {formatPrice(model.pricePerImage ?? "0")}
              </span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Per 1M tokens</TableHead>
                  <TableHead>Per 1k tokens</TableHead>
                  <TableHead>Per token</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Input (prompt)</TableCell>
                  <TableCell>{formatPrice(model.inputPricePer1m)}</TableCell>
                  <TableCell>
                    {formatPrice(
                      (parseFloat(model.inputPricePer1m) / 1_000).toString()
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    ${(parseFloat(model.inputPricePer1m ) / 1_000_000).toFixed(10)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Output (completion)</TableCell>
                  <TableCell>{formatPrice(model.outputPricePer1m)}</TableCell>
                  <TableCell>
                    {formatPrice(
                      (parseFloat(model.outputPricePer1m) / 1_000).toString()
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    ${(parseFloat(model.outputPricePer1m) / 1_000_000).toFixed(10)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Section 2 — Cost estimator */}
      <Card>
        <CardHeader>
          <CardTitle>Estimate your cost</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prompt-tokens">Prompt tokens</Label>
              <Input
                id="prompt-tokens"
                type="number"
                min={0}
                value={promptTokens}
                onChange={(e) => setPromptTokens(Math.max(0, parseInt(e.target.value) || 0))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="completion-tokens">Completion tokens</Label>
              <Input
                id="completion-tokens"
                type="number"
                min={0}
                value={completionTokens}
                onChange={(e) =>
                  setCompletionTokens(Math.max(0, parseInt(e.target.value) || 0))
                }
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground">Estimated cost</span>
            <span className="font-mono text-2xl font-bold">
              {estimateCost(
                promptTokens,
                completionTokens,
                model.inputPricePer1m,
                model.outputPricePer1m
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
