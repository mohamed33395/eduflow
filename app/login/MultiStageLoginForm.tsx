"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/app/lib/i18n/client";
import type { AppUser } from "@/app/types";
import { IdentifierPhase } from "./login-phases/identifier";
import { PasswordPhase } from "./login-phases/password";
import { OtpPhase } from "./login-phases/otp";
import { ForgetPasswordPhase } from "./login-phases/forget-password";
import { ResetPasswordPhase } from "./login-phases/reset-password";

type Phase = "identifier" | "password" | "otp" | "forget-password" | "reset-password";

interface LoginWay {
  type?: "mail" | "sms";
  name?: string;
  by?: string;
  step?: { login_option?: string };
}

export function MultiStageLoginForm() {
  const [phase, setPhase] = useState<Phase>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [stepToken, setStepToken] = useState("");
  const [verifiedToken, setVerifiedToken] = useState("");
  const [loginWay, setLoginWay] = useState<LoginWay | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  // API base URL from environment
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  // Step 1: Get login ways
  const handleIdentifierSubmit = async (id: string) => {
    setIdentifier(id);
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auths/get-login-ways`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to get login ways");
      }

      setStepToken(data.payload.token);
      setLoginWay(data.payload.login_way);

      // Determine next phase based on login option
      if (data.payload.login_way.step.login_option === "otp") {
        setPhase("otp");
      } else {
        setPhase("password");
      }
    } catch (err) {
      console.error("[GetLoginWays] Full error:", err);
      console.error("[GetLoginWays] Error details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        status: (err as { status?: number })?.status,
      });
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Login with password or OTP
  const handlePasswordSubmit = async (password: string) => {
    setError("");
    setLoading(true);

    try {
      // Go through the BFF so session cookies get set on this origin
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          token: stepToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Login failed");
      }

      // Check if login is complete (BFF returned the mapped user)
      if (data.user) {
        const user = data.user as AppUser;
        const redirect = searchParams.get("redirect");
        router.replace(resolveRedirect(redirect, user.role));
        router.refresh();
      } else if (data.payload) {
        // Another step required
        setStepToken(data.payload.token);
        setLoginWay(data.payload.login_way);
        if (data.payload.login_way?.step?.login_option === "otp") {
          setPhase("otp");
        }
      }
    } catch (err) {
      console.error("[LoginStep] Full error:", err);
      console.error("[LoginStep] Error details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        status: (err as { status?: number })?.status,
      });
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  // Step 2 alternative: Login with OTP
  const handleOtpSubmit = async (otp: string) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password: otp, // OTP sent in password field per Constrix spec
          token: stepToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "OTP verification failed");
      }

      // Check if login is complete
      if (data.user) {
        const user = data.user as AppUser;
        const redirect = searchParams.get("redirect");
        router.replace(resolveRedirect(redirect, user.role));
        router.refresh();
      }
    } catch (err) {
      console.error("[OtpLogin] Full error:", err);
      console.error("[OtpLogin] Error details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        status: (err as { status?: number })?.status,
      });
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  // Start forgot password flow
  const handleForgotPassword = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auths/forget-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          token: stepToken,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to initiate password reset");
      }

      setPhase("forget-password");
    } catch (err) {
      console.error("[ForgotPassword] Full error:", err);
      console.error("[ForgotPassword] Error details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        status: (err as { status?: number })?.status,
      });
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  // Validate OTP for password reset
  const handleForgetPasswordOtpSubmit = async (otp: string) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auths/validate-reset-password-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          otp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "OTP verification failed");
      }

      setVerifiedToken(data.token);
      setPhase("reset-password");
    } catch (err) {
      console.error("[ValidateResetOtp] Full error:", err);
      console.error("[ValidateResetOtp] Error details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        status: (err as { status?: number })?.status,
      });
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const handleResetPasswordSubmit = async (password: string, confirmation: string) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auths/reset-password-with-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          password,
          passwordConfirmation: confirmation,
          token: verifiedToken,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to reset password");
      }

      // Password reset successful - return to identifier phase
      setPhase("identifier");
      setIdentifier("");
      setStepToken("");
      setVerifiedToken("");
    } catch (err) {
      console.error("[ResetPassword] Full error:", err);
      console.error("[ResetPassword] Error details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        status: (err as { status?: number })?.status,
      });
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auths/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          token: stepToken,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to resend OTP");
      }
    } catch (err) {
      console.error("[ResendOtp] Full error:", err);
      console.error("[ResendOtp] Error details:", {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        status: (err as { status?: number })?.status,
      });
      setError(err instanceof Error ? err.message : t("unexpectedError"));
    } finally {
      setLoading(false);
    }
  };

  // Cancel and go back
  const handleCancel = () => {
    setPhase("identifier");
    setIdentifier("");
    setStepToken("");
    setError("");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">EduFlow</h1>
          <p className="text-slate-500 mt-2">{t("signInToDashboard")}</p>
        </div>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {phase === "identifier" && (
          <IdentifierPhase onSubmit={handleIdentifierSubmit} loading={loading} />
        )}

        {phase === "password" && (
          <PasswordPhase
            identifier={identifier}
            onSubmit={handlePasswordSubmit}
            onForgotPassword={handleForgotPassword}
            loading={loading}
          />
        )}

        {phase === "otp" && (
          <OtpPhase
            identifier={identifier}
            channel={loginWay?.type || "mail"}
            onSubmit={handleOtpSubmit}
            onResend={handleResendOtp}
            loading={loading}
          />
        )}

        {phase === "forget-password" && (
          <ForgetPasswordPhase
            identifier={identifier}
            stepToken={stepToken}
            onSubmit={handleForgetPasswordOtpSubmit}
            onCancel={handleCancel}
            loading={loading}
          />
        )}

        {phase === "reset-password" && (
          <ResetPasswordPhase
            identifier={identifier}
            verifiedToken={verifiedToken}
            onSubmit={handleResetPasswordSubmit}
            loading={loading}
          />
        )}
      </div>
    </main>
  );
}

function getHomeForRole(role: AppUser["role"]): string {
  switch (role) {
    case "super_admin":
      return "/admin";
    case "center_owner":
      return "/center";
    case "course_owner":
      return "/course";
    case "teacher":
      return "/teacher";
    case "student":
      return "/student";
    default:
      return "/";
  }
}

function resolveRedirect(redirect: string | null, role: AppUser["role"]): string {
  if (!redirect) return getHomeForRole(role);
  const home = getHomeForRole(role);
  if (role === "super_admin" && redirect.startsWith("/admin")) return redirect;
  if (role === "center_owner" && redirect.startsWith("/center")) return redirect;
  if (role === "course_owner" && redirect.startsWith("/course")) return redirect;
  if (role === "teacher" && redirect.startsWith("/teacher")) return redirect;
  if (role === "student" && redirect.startsWith("/student")) return redirect;
  return home;
}
