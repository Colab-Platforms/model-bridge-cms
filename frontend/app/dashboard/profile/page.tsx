"use client";

import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { motion } from "motion/react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import type { User } from "@/types";

// ── Schema ────────────────────────────────────────────────────────────────────

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

const containerVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 30 } },
};

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

export default function ProfilePage() {
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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-3xl space-y-6"
    >
      <motion.div variants={itemVariants}>
        <h2 className="text-3xl font-bold tracking-tight text-foreground/90">Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal information and how it appears on your account.
        </p>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <motion.form
          variants={itemVariants}
          onSubmit={handleSubmit((d) => mutate(d))}
          className="space-y-5"
        >
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
        </motion.form>
      )}
    </motion.div>
  );
}
