"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Monitor, Smartphone, Shield } from "lucide-react";
import { motion } from "motion/react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import type { Session, User } from "@/types";

// ── Schemas ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName:    z.string().min(1, "First name is required"),
  lastName:     z.string().min(1, "Last name is required"),
  phoneNo:      z.string().optional(),
  countryCode:  z.string().optional(),
  city:         z.string().optional(),
  state:        z.string().optional(),
  country:      z.string().optional(),
  timezone:     z.string().optional(),
  profileImage: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword:     z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
type PasswordValues = z.infer<typeof passwordSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(ts?: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function parseUserAgent(ua?: string) {
  if (!ua) return "Unknown device";
  if (ua.includes("Chrome"))  return "Chrome";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari"))  return "Safari";
  if (ua.includes("Edge"))    return "Edge";
  return ua.slice(0, 36);
}

const containerVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 30 } },
};

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="size-1 bg-primary shrink-0" />
      <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  id, label, error, children,
}: {
  id?: string; label: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery<User>({
    queryKey: ["profile"],
    queryFn:  () => api.get("/users/me").then((r) => r.data),
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } =
    useForm<ProfileValues>({
      resolver: zodResolver(profileSchema),
      defaultValues: {
        firstName: "", lastName: "", phoneNo: "", countryCode: "",
        city: "", state: "", country: "", timezone: "", profileImage: "",
      },
    });

  useEffect(() => {
    if (profile) {
      reset({
        firstName:    profile.firstName    ?? "",
        lastName:     profile.lastName     ?? "",
        phoneNo:      profile.phoneNo      ?? "",
        countryCode:  profile.countryCode  ?? "",
        city:         profile.city         ?? "",
        state:        profile.state        ?? "",
        country:      profile.country      ?? "",
        timezone:     profile.timezone     ?? "",
        profileImage: profile.profileImage ?? "",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: ProfileValues) =>
      api.patch("/users/me", data).then((r) => r.data),
    onSuccess: (updated: User) => {
      setUser(updated);
      queryClient.setQueryData(["profile"], updated);
      toast.success("Profile updated");
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const imageUrl    = watch("profileImage");
  const displayUser = profile ?? user;
  const initials    = displayUser
    ? `${displayUser.firstName?.[0] ?? ""}${displayUser.lastName?.[0] ?? ""}`.toUpperCase()
    : "??";

  if (isLoading) {
    return (
      <div className="space-y-3 pt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-5 pt-6">

      {/* ── Hero: avatar + account snapshot ── */}
      <Card className="rounded-2xl border-border/40 bg-gradient-to-br from-primary/10 via-background to-background shadow-sm overflow-hidden">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20 rounded-lg shrink-0 ring-2 ring-primary/20">
              {imageUrl && <AvatarImage src={imageUrl} alt="Profile" />}
              <AvatarFallback className="rounded-lg text-2xl font-black bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-bold text-foreground leading-tight truncate">
                {displayUser?.firstName} {displayUser?.lastName}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {displayUser?.email}
              </p>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-tight border",
                  displayUser?.status === "ACTIVE"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                    : "bg-zinc-500/10 border-zinc-500/20 text-zinc-500"
                )}>
                  <span className={cn(
                    "size-1.5 rounded-full",
                    displayUser?.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                  )} />
                  {displayUser?.status?.toLowerCase() ?? "—"}
                </span>
                <span className="inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-black uppercase tracking-tight border border-primary/20 bg-primary/10 text-primary">
                  {displayUser?.role?.toLowerCase() ?? "—"}
                </span>
                {profile?.createdAt && (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Member since {new Date(profile.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Avatar URL ── */}
      <Card className="rounded-2xl border-border/40 bg-card/60 backdrop-blur-md shadow-sm">
        <CardContent className="pt-5 pb-5">
          <SectionLabel label="Profile image" />
          <Field id="profileImage" label="Image URL" error={errors.profileImage?.message}>
            <Input
              id="profileImage"
              placeholder="https://example.com/avatar.png"
              className="rounded-lg"
              {...register("profileImage")}
            />
          </Field>
        </CardContent>
      </Card>

      {/* ── Personal info ── */}
      <Card className="rounded-2xl border-border/40 bg-card/60 backdrop-blur-md shadow-sm">
        <CardContent className="pt-5 pb-5">
          <SectionLabel label="Personal information" />
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="firstName" label="First name" error={errors.firstName?.message}>
                <Input id="firstName" className="rounded-lg" {...register("firstName")} />
              </Field>
              <Field id="lastName" label="Last name" error={errors.lastName?.message}>
                <Input id="lastName" className="rounded-lg" {...register("lastName")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="countryCode" label="Country code">
                <Input id="countryCode" placeholder="+1" className="rounded-lg" {...register("countryCode")} />
              </Field>
              <Field id="phoneNo" label="Phone number">
                <Input id="phoneNo" placeholder="555 000 1234" className="rounded-lg" {...register("phoneNo")} />
              </Field>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Location ── */}
      <Card className="rounded-2xl border-border/40 bg-card/60 backdrop-blur-md shadow-sm">
        <CardContent className="pt-5 pb-5">
          <SectionLabel label="Location" />
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="city" label="City">
                <Input id="city" className="rounded-lg" {...register("city")} />
              </Field>
              <Field id="state" label="State / Province">
                <Input id="state" className="rounded-lg" {...register("state")} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="country" label="Country">
                <Input id="country" className="rounded-lg" {...register("country")} />
              </Field>
              <Field id="timezone" label="Timezone">
                <Input id="timezone" placeholder="America/New_York" className="rounded-lg" {...register("timezone")} />
              </Field>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Account info (read-only) ── */}
      <Card className="rounded-2xl border-border/40 bg-card/60 backdrop-blur-md shadow-sm">
        <CardContent className="pt-5 pb-2">
          <SectionLabel label="Account info" />
          <div className="divide-y divide-border/40">
            {[
              { label: "Email", value: displayUser?.email ?? "—" },
              { label: "Auth provider", value: displayUser?.authProvider?.toLowerCase() ?? "local" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
                <span className="text-sm font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 pb-2">
            Contact support to change your email address.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-2">
        <Button
          type="submit"
          disabled={isPending}
          className="rounded-lg font-bold uppercase text-xs tracking-wider h-10 px-6 shadow-lg shadow-primary/20"
        >
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </form>
  );
}

// ── Password Section ──────────────────────────────────────────────────────────

function PasswordSection() {
  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: PasswordValues) =>
      api.patch("/users/me/password", {
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      }),
    onSuccess: () => { toast.success("Password changed successfully"); reset(); },
    onError:   () => toast.error("Failed to change password — check your current password"),
  });

  return (
    <Card className="rounded-2xl border-border/40 bg-card/60 backdrop-blur-md shadow-sm">
      <CardContent className="pt-5 pb-5">
        <SectionLabel label="Change password" />
        <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
          <Field id="currentPassword" label="Current password" error={errors.currentPassword?.message}>
            <Input id="currentPassword" type="password" autoComplete="current-password" className="rounded-lg" {...register("currentPassword")} />
          </Field>
          <Field id="newPassword" label="New password" error={errors.newPassword?.message}>
            <Input id="newPassword" type="password" autoComplete="new-password" className="rounded-lg" {...register("newPassword")} />
          </Field>
          <Field id="confirmPassword" label="Confirm new password" error={errors.confirmPassword?.message}>
            <Input id="confirmPassword" type="password" autoComplete="new-password" className="rounded-lg" {...register("confirmPassword")} />
          </Field>
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-lg font-bold uppercase text-xs tracking-wider h-10 px-6"
            >
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Sessions Section ──────────────────────────────────────────────────────────

function SessionsSection() {
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ["sessions"],
    queryFn:  () => api.get("/sessions").then((r) => r.data),
  });

  const revokeOne = useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/${id}`),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ["sessions"] }); toast.success("Session revoked"); },
    onError:    () => toast.error("Failed to revoke session"),
  });

  const revokeAll = useMutation({
    mutationFn: () => api.delete("/sessions"),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ["sessions"] }); toast.success("All other sessions revoked"); },
    onError:    () => toast.error("Failed to revoke sessions"),
  });

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <Card className="rounded-2xl border-border/40 bg-card/60 backdrop-blur-md shadow-sm">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <SectionLabel label="Active sessions" />
          {otherSessions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={revokeAll.isPending}
              onClick={() => revokeAll.mutate()}
              className="rounded-lg text-[10px] font-black uppercase tracking-wider border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive shrink-0 -mt-1"
            >
              {revokeAll.isPending && <Loader2 className="mr-1.5 size-3 animate-spin" />}
              Revoke all other
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
              <Shield className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No active sessions found.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/40">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/40 bg-muted/40 hover:bg-muted/40">
                  {["Device", "IP Address", "Last used", "Expires", ""].map((h) => (
                    <TableHead key={h} className="text-[11px] font-black uppercase tracking-widest text-muted-foreground py-4">
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow
                    key={session.id}
                    className="group/row border-b border-border/10 hover:bg-primary/5 transition-colors"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted border border-border/40">
                          {session.deviceName?.toLowerCase().includes("mobile") ? (
                            <Smartphone className="size-3.5 text-muted-foreground" />
                          ) : (
                            <Monitor className="size-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground leading-none">
                            {session.deviceName ?? parseUserAgent(session.userAgent)}
                          </p>
                          {session.isCurrent && (
                            <span className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-emerald-300/50 bg-emerald-500/10 px-1.5 py-px text-[10px] font-black uppercase tracking-tight text-emerald-600">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Current
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {session.ipAddress ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(session.lastUsedAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(session.expiresAt)}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      {!session.isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={revokeOne.isPending}
                          onClick={() => revokeOne.mutate(session.id)}
                          className="rounded-lg text-[10px] font-black uppercase tracking-wider text-destructive hover:text-destructive hover:bg-destructive/5 opacity-0 group-hover/row:opacity-100 transition-opacity"
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Security Tab ──────────────────────────────────────────────────────────────

function SecurityTab() {
  return (
    <div className="space-y-5 pt-6">
      <PasswordSection />
      <SessionsSection />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-3xl space-y-6"
    >
      {/* Page header */}
      <motion.div variants={itemVariants}>
        <h2 className="text-3xl font-bold tracking-tight text-foreground/90">Account Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile information and account security.
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="profile">
          <TabsList className="rounded-lg border border-border/50 bg-background/60 p-0 h-10 w-full grid grid-cols-2">
            <TabsTrigger
              value="profile"
              className="rounded-lg text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none transition-all"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="rounded-lg text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none transition-all"
            >
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileTab />
          </TabsContent>
          <TabsContent value="security">
            <SecurityTab />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
