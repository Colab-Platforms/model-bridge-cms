"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import axios from "axios";

import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emailSchema = z.object({
  email: z.email({ error: "Enter a valid email" }),
});

const resetSchema = z
  .object({
    otp: z
      .string()
      .length(6, "Code must be 6 digits")
      .refine((v) => /^\d+$/.test(v), "Code must be numeric"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type EmailFormValues = z.infer<typeof emailSchema>;
type ResetFormValues = z.infer<typeof resetSchema>;

export function ForgotPasswordForm({ className }: React.ComponentProps<"form">) {
  const router = useRouter();

  const [step, setStep] = useState<"email" | "reset">("email");
  const [pendingEmail, setPendingEmail] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailFormValues>({ resolver: zodResolver(emailSchema) });

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors, isSubmitting: isResetting },
  } = useForm<ResetFormValues>({ resolver: zodResolver(resetSchema) });

  const onRequestOtp = async (values: EmailFormValues) => {
    setServerError(null);
    try {
      await api.post("/auth/forgot-password", { email: values.email });
      setPendingEmail(values.email);
      setStep("reset");
      toast.info("Password reset code sent to your email.");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setServerError(
          err.response?.data?.message ?? "Something went wrong. Please try again."
        );
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  };

  const onResetPassword = async (values: ResetFormValues) => {
    setServerError(null);
    try {
      await api.post("/auth/reset-password", {
        email: pendingEmail,
        otp: values.otp,
        newPassword: values.newPassword,
      });
      toast.success("Password reset successfully. Please sign in.");
      router.push("/auth/login");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setServerError(
          err.response?.data?.message ?? "Password reset failed. Please try again."
        );
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  };

  const onResend = async () => {
    setResending(true);
    setServerError(null);
    try {
      await api.post("/auth/forgot-password", { email: pendingEmail });
      toast.success("Password reset code resent.");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message ?? "Failed to resend code.");
      } else {
        toast.error("Something went wrong.");
      }
    } finally {
      setResending(false);
    }
  };

  // ── Reset step ──────────────────────────────────────────────────────────
  if (step === "reset") {
    return (
      <form
        className={cn("flex flex-col gap-6", className)}
        onSubmit={handleResetSubmit(onResetPassword)}
      >
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="text-sm text-balance text-muted-foreground">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-foreground">{pendingEmail}</span>
          </p>
        </div>

        {serverError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            {serverError}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="otp">Verification Code</Label>
          <Input
            id="otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            autoComplete="one-time-code"
            className="bg-background text-center tracking-[0.5em] text-lg font-mono"
            {...registerReset("otp")}
          />
          {resetErrors.otp && (
            <p className="text-xs text-destructive">{resetErrors.otp.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="newPassword">New Password</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              className="bg-background pr-10"
              {...registerReset("newPassword")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {resetErrors.newPassword && (
            <p className="text-xs text-destructive">{resetErrors.newPassword.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              className="bg-background pr-10"
              {...registerReset("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {resetErrors.confirmPassword && (
            <p className="text-xs text-destructive">
              {resetErrors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" disabled={isResetting}>
          {isResetting ? "Resetting..." : "Reset Password"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t receive the code?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={resending}
            className="underline underline-offset-4 hover:text-foreground disabled:opacity-50"
          >
            {resending ? "Sending..." : "Resend"}
          </button>
        </p>

        <p className="text-center text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setServerError(null);
            }}
            className="underline underline-offset-4 hover:text-foreground"
          >
            Use a different email
          </button>
        </p>
      </form>
    );
  }

  // ── Email step ──────────────────────────────────────────────────────────
  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit(onRequestOtp)}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold">Forgot your password?</h1>
        <p className="text-sm text-balance text-muted-foreground">
          Enter your email and we&apos;ll send you a code to reset your password
        </p>
      </div>

      {serverError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="m@example.com"
          className="bg-background"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send Reset Code"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <a href="/auth/login" className="underline underline-offset-4">
          Sign in
        </a>
      </p>
    </form>
  );
}
