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
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const registerSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.email({ error: "Enter a valid email" }),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const otpSchema = z.object({
  otp: z
    .string()
    .length(6, "Code must be 6 digits")
    .refine((v) => /^\d+$/.test(v), "Code must be numeric"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

export function SignupForm({ className }: React.ComponentProps<"form">) {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState<"register" | "verify">("register");
  const [pendingEmail, setPendingEmail] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const {
    register: registerOtp,
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors, isSubmitting: isVerifying },
  } = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema) });

  const goToVerify = async (email: string) => {
    try {
      await api.post("/auth/resend-email-otp", { email });
    } catch {
      // If resend fails (e.g. already verified), the verify step will surface the error on submit.
    }
    setPendingEmail(email);
    setStep("verify");
  };

  const onRegister = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await api.post("/auth/register", {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
      });
      setPendingEmail(values.email);
      setStep("verify");
      toast.info("Verification code sent to your email.");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const msg = err.response?.data?.message ?? "Registration failed. Please try again.";

        // 409 = email already registered. Offer to resend OTP in case they're unverified.
        if (status === 409) {
          setPendingEmail(values.email);
          setServerError(msg);
          return;
        }

        setServerError(msg);
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  };

  const onVerify = async (values: OtpFormValues) => {
    setServerError(null);
    try {
      const { data } = await api.post("/auth/verify-email-otp", {
        email: pendingEmail,
        otp: values.otp,
      });
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
      try {
        await api.post("/wallets");
      } catch {}
      toast.success("Account verified! Welcome to ModelBridge.");
      router.push("/dashboard");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setServerError(
          err.response?.data?.message ?? "Verification failed. Please try again."
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
      await api.post("/auth/resend-email-otp", { email: pendingEmail });
      toast.success("Verification code resent.");
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

  // ── OTP verification step ──────────────────────────────────────────────────
  if (step === "verify") {
    return (
      <form
        className={cn("flex flex-col gap-6", className)}
        onSubmit={handleOtpSubmit(onVerify)}
      >
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Check your email</h1>
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
            {...registerOtp("otp")}
          />
          {otpErrors.otp && (
            <p className="text-xs text-destructive">{otpErrors.otp.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isVerifying}>
          {isVerifying ? "Verifying..." : "Verify Email"}
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
              setStep("register");
              setServerError(null);
            }}
            className="underline underline-offset-4 hover:text-foreground"
          >
            Back to registration
          </button>
        </p>
      </form>
    );
  }

  // ── Registration step ──────────────────────────────────────────────────────
  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit(onRegister)}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-balance text-muted-foreground">
          Fill in the form below to create your account
        </p>
      </div>

      {serverError && (
        <div className="rounded-md bg-destructive/10 px-3 py-2.5 text-center text-sm text-destructive flex flex-col gap-2">
          <p>{serverError}</p>
          {pendingEmail && (
            <div className="flex flex-col gap-1.5 pt-1 border-t border-destructive/20">
              <button
                type="button"
                onClick={() => goToVerify(pendingEmail)}
                className="text-xs font-semibold text-destructive underline underline-offset-4 hover:opacity-80"
              >
                Not verified yet? Resend code
              </button>
              <a
                href="/auth/login"
                className="text-xs font-semibold text-destructive underline underline-offset-4 hover:opacity-80"
              >
                Already verified? Sign in
              </a>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            type="text"
            placeholder="John"
            className="bg-background"
            {...register("firstName")}
          />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Doe"
            className="bg-background"
            {...register("lastName")}
          />
          {errors.lastName && (
            <p className="text-xs text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

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

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            className="bg-background pr-10"
            {...register("password")}
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
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            className="bg-background pr-10"
            {...register("confirmPassword")}
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
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create Account"}
      </Button>

      <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">
          Or continue with
        </span>
      </div>

      <Button
        variant="outline"
        type="button"
        onClick={() => {
          window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google/start`;
        }}
      >
        <GoogleIcon className="size-4" />
        Continue with Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <a href="/auth/login" className="underline underline-offset-4">
          Sign in
        </a>
      </p>
    </form>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
