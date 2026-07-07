"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "motion/react";
import { User, Sun, Moon, Monitor } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

// ── Motion ────────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 30 } },
};

// ── Layout primitives ─────────────────────────────────────────────────────────

function PreferenceRow({
  title, description, children,
}: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

const CHATROOM_COLORS = [
  { value: "default", label: "Default", dot: "bg-primary" },
  { value: "rose",    label: "Rose",    dot: "bg-rose-500" },
  { value: "emerald", label: "Emerald", dot: "bg-emerald-500" },
  { value: "amber",   label: "Amber",   dot: "bg-amber-500" },
  { value: "violet",  label: "Violet",  dot: "bg-violet-500" },
] as const;

const DATE_FORMATS = [
  { value: "default", label: "Default" },
  { value: "mdy",      label: "MM/DD/YYYY" },
  { value: "dmy",      label: "DD/MM/YYYY" },
  { value: "iso",      label: "YYYY-MM-DD" },
  { value: "relative", label: "Relative (e.g. 2 hours ago)" },
] as const;

const DEFAULT_PRESETS = [
  { value: "none",     label: "None" },
  { value: "concise",  label: "Concise" },
  { value: "balanced", label: "Balanced" },
  { value: "detailed", label: "Detailed" },
] as const;

const THEME_OPTIONS = [
  { value: "light",  label: "Light",  icon: Sun },
  { value: "dark",   label: "Dark",   icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function PreferencesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useTheme();

  const [chatroomColor, setChatroomColor] = useState<string>("default");
  const [dateFormat, setDateFormat] = useState<string>("default");
  const [defaultPreset, setDefaultPreset] = useState<string>("none");
  const [analyticsCookies, setAnalyticsCookies] = useState(false);
  const [lowBalanceAlerts, setLowBalanceAlerts] = useState(false);
  const [chatCompletionNotifications, setChatCompletionNotifications] = useState(false);

  const selectedColor = CHATROOM_COLORS.find((c) => c.value === chatroomColor);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-5xl mx-auto space-y-2"
    >
      <motion.div variants={itemVariants}>
        <h2 className="text-3xl font-bold tracking-tight text-foreground/90">Preferences</h2>
      </motion.div>

      <motion.div variants={itemVariants} className="divide-y divide-border/40">
        <PreferenceRow
          title="User"
          description="Manage your login credentials, security settings, or delete your account."
        >
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => router.push("/dashboard/settings")}
          >
            Manage
          </Button>
        </PreferenceRow>

        <PreferenceRow
          title="Organization"
          description="Create and manage your organization."
        >
          <Button variant="outline" size="sm" className="rounded-lg">
            Create
          </Button>
        </PreferenceRow>

        <PreferenceRow
          title="Account Type"
          description={
            <>
              Your current account tier.{" "}
              <span className="text-primary underline underline-offset-2 cursor-default">
                Learn more
              </span>
            </>
          }
        >
          <Badge variant="outline" className="rounded-lg gap-1.5 h-7 px-2.5">
            Self Serve
            <User className="size-3" />
          </Badge>
        </PreferenceRow>

        <PreferenceRow
          title="Appearance"
          description="Theme for the dashboard interface."
        >
          <div className="flex items-center gap-1 rounded-lg border border-border/50 p-0.5">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-label={label}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md transition-colors",
                  theme === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
          </div>
        </PreferenceRow>

        <PreferenceRow
          title="Chatroom Color"
          description="Custom bubble color for this device."
        >
          <Select value={chatroomColor} onValueChange={setChatroomColor}>
            <SelectTrigger className="rounded-lg h-8 w-[140px]" size="sm">
              <span className={cn("inline-block size-2 rounded-full mr-1", selectedColor?.dot)} />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHATROOM_COLORS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  <span className={cn("inline-block size-2 rounded-full mr-1.5", c.dot)} />
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PreferenceRow>

        <PreferenceRow
          title="Date Format"
          description="How dates appear in logs and activity tables."
        >
          <Select value={dateFormat} onValueChange={setDateFormat}>
            <SelectTrigger className="rounded-lg h-8 w-[160px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PreferenceRow>

        <PreferenceRow
          title="Default Preset"
          description="Default preset for new messages in the chatroom."
        >
          <Select value={defaultPreset} onValueChange={setDefaultPreset}>
            <SelectTrigger className="rounded-lg h-8 w-[140px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_PRESETS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PreferenceRow>

        <PreferenceRow
          title="Enable analytics cookies"
          description="Allow analytics cookies to help us improve the user experience and site performance."
        >
          <Switch checked={analyticsCookies} onCheckedChange={setAnalyticsCookies} />
        </PreferenceRow>
      </motion.div>

      <motion.div variants={itemVariants} className="pt-8">
        <h3 className="text-base font-bold text-foreground/90 mb-2">Notifications</h3>
        <div className="divide-y divide-border/40">
          <PreferenceRow
            title="Low Balance Alerts"
            description={<>Emails sent to <span className="font-semibold text-foreground">{user?.email ?? "—"}</span></>}
          >
            <Switch checked={lowBalanceAlerts} onCheckedChange={setLowBalanceAlerts} />
          </PreferenceRow>

          <PreferenceRow
            title="Chat Completion Notifications"
            description="Browser notifications when chat responses complete (only when tab is not focused)."
          >
            <Switch checked={chatCompletionNotifications} onCheckedChange={setChatCompletionNotifications} />
          </PreferenceRow>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="border-t border-border/40 pt-5">
        <p className="text-xs text-muted-foreground">
          Your chat history in the{" "}
          <span className="text-primary font-medium">Chatroom</span>{" "}
          is always stored locally on your device.
        </p>
      </motion.div>
    </motion.div>
  );
}
