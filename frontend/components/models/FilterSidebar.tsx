"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { CapabilityType } from "@/types/index";
import { CAPABILITY_LABELS, MODALITY_LABELS } from "@/lib/modelUtils";
import { Skeleton } from "@/components/ui/skeleton";

interface FilterSidebarProps {
  providers: { id: string; displayName: string; count: number }[];
  maxInputPrice: number;
  maxOutputPrice: number;
  isLoading?: boolean;
}

const CONTEXT_PRESETS = [
  { label: "8k+", value: 8192 },
  { label: "32k+", value: 32768 },
  { label: "128k+", value: 131072 },
  { label: "200k+", value: 200000 },
] as const;

const capabilities = Object.keys(CAPABILITY_LABELS) as CapabilityType[];

export function FilterSidebar({
  providers,
  maxInputPrice,
  maxOutputPrice,
  isLoading = false,
}: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(
    () => searchParams.get("q") ?? ""
  );
  const [providerOpen, setProviderOpen] = useState(true);
  const [capabilityOpen, setCapabilityOpen] = useState(true);
  const [inputModalityOpen, setInputModalityOpen] = useState(true);
  const [outputModalityOpen, setOutputModalityOpen] = useState(true);
  const [contextOpen, setContextOpen] = useState(true);
  const [inputPriceOpen, setInputPriceOpen] = useState(true);
  const [outputPriceOpen, setOutputPriceOpen] = useState(true);

  const isFirstRender = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stable ref so the debounce closure always reads the latest searchParams
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  // Derived values from URL
  const activeProviders = searchParams.getAll("providerId");
  const activeCapabilities = searchParams.getAll("capability") as CapabilityType[];
  const activeInputModalities = searchParams.getAll("inputModality");
  const activeOutputModalities = searchParams.getAll("outputModality");
  const activeMinContext = searchParams.has("minContext")
    ? parseInt(searchParams.get("minContext")!, 10)
    : null;
  const inputPriceValue = searchParams.has("maxInputPrice")
    ? parseFloat(searchParams.get("maxInputPrice")!)
    : maxInputPrice;
  const outputPriceValue = searchParams.has("maxOutputPrice")
    ? parseFloat(searchParams.get("maxOutputPrice")!)
    : maxOutputPrice;

  const hasActiveFilters =
    searchParams.has("q") ||
    searchParams.has("providerId") ||
    searchParams.has("capability") ||
    searchParams.has("inputModality") ||
    searchParams.has("outputModality") ||
    searchParams.has("minContext") ||
    searchParams.has("maxContext") ||
    searchParams.has("maxInputPrice") ||
    searchParams.has("maxOutputPrice");

  // Debounce search value → URL
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      if (searchValue.trim()) {
        params.set("q", searchValue.trim());
      } else {
        params.delete("q");
      }
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  function toggleArrayParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const existing = params.getAll(key);
    params.delete(key);
    if (existing.includes(value)) {
      existing.filter((v) => v !== value).forEach((v) => params.append(key, v));
    } else {
      [...existing, value].forEach((v) => params.append(key, v));
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  function clearAll() {
    setSearchValue("");
    router.push("/models");
  }

  return (
    <div className="sticky top-4 space-y-6">
      {/* Clear all — rendered at the top when any filter is active */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="w-full justify-start text-muted-foreground"
        >
          <X className="mr-1.5 size-3.5" />
          Clear all
        </Button>
      )}

      {/* Search */}
      <div className="relative">
        <Input
          placeholder="Search models..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pr-8"
        />
        {searchValue && (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSearchValue("");
              updateParam("q", null);
            }}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <Separator />

      {/* Provider */}
      <Collapsible open={providerOpen} onOpenChange={setProviderOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium">
          Provider
          {providerOpen ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-4 w-6 rounded-full" />
              </div>
            ))
          ) : providers.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-1 italic">No providers found</p>
          ) : (
            providers.map((provider) => (
              <label
                key={provider.id}
                className="flex cursor-pointer items-center gap-2"
              >
                <Checkbox
                  checked={activeProviders.includes(provider.id)}
                  onCheckedChange={() =>
                    toggleArrayParam("providerId", provider.id)
                  }
                />
                <span className="flex-1 text-sm">{provider.displayName}</span>
                <Badge variant="secondary" className="text-xs">
                  {provider.count}
                </Badge>
              </label>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Capability */}
      <Collapsible open={capabilityOpen} onOpenChange={setCapabilityOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium">
          Capability
          {capabilityOpen ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
          {capabilities.map((cap) => (
            <label
              key={cap}
              className="flex cursor-pointer items-center gap-2"
            >
              <Checkbox
                checked={activeCapabilities.includes(cap)}
                onCheckedChange={() => toggleArrayParam("capability", cap)}
              />
              <span className="text-sm">{CAPABILITY_LABELS[cap]}</span>
            </label>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Input Modalities */}
      <Collapsible open={inputModalityOpen} onOpenChange={setInputModalityOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium">
          Input Modalities
          {inputModalityOpen ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
          {Object.entries(MODALITY_LABELS).map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={activeInputModalities.includes(value)}
                onCheckedChange={() => toggleArrayParam("inputModality", value)}
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Output Modalities */}
      <Collapsible open={outputModalityOpen} onOpenChange={setOutputModalityOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium">
          Output Modalities
          {outputModalityOpen ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
          {Object.entries(MODALITY_LABELS).map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={activeOutputModalities.includes(value)}
                onCheckedChange={() => toggleArrayParam("outputModality", value)}
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Context Window */}
      <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium">
          Context Window
          {contextOpen ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="grid grid-cols-2 gap-2">
            {CONTEXT_PRESETS.map((preset) => {
              const isActive = activeMinContext === preset.value;
              return (
                <Button
                  key={preset.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    updateParam(
                      "minContext",
                      isActive ? null : String(preset.value)
                    )
                  }
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Max Input Price */}
      <Collapsible open={inputPriceOpen} onOpenChange={setInputPriceOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium">
          Max Input Price
          {inputPriceOpen ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
          {isLoading ? (
            <Skeleton className="h-6 w-full rounded" />
          ) : (
            <>
              <input
                type="range"
                min={0}
                max={maxInputPrice}
                step={0.5}
                value={inputPriceValue}
                onChange={(e) => updateParam("maxInputPrice", e.target.value)}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                ${inputPriceValue.toFixed(2)} / 1M
              </p>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Max Output Price */}
      <Collapsible open={outputPriceOpen} onOpenChange={setOutputPriceOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium">
          Max Output Price
          {outputPriceOpen ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
          {isLoading ? (
            <Skeleton className="h-6 w-full rounded" />
          ) : (
            <>
              <input
                type="range"
                min={0}
                max={maxOutputPrice}
                step={0.5}
                value={outputPriceValue}
                onChange={(e) => updateParam("maxOutputPrice", e.target.value)}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                ${outputPriceValue.toFixed(2)} / 1M
              </p>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
