"use client";

import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ease, fadeUp, stagger } from "@/components/motion/presets";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { authClient, safeNext } from "@/lib/auth-client";
import { cn } from "@/lib/cn";

type Mode = "sign-in" | "sign-up";

const COPY: Record<Mode, { title: React.ReactNode; subtitle: string; cta: string }> = {
  "sign-in": { title: <>Welcome <em>back</em>.</>, subtitle: "Sign in to open your vault.", cta: "Sign in" },
  "sign-up": { title: <>Create your <em>vault</em>.</>, subtitle: "Every file you add starts private.", cta: "Create account" },
};

function friendlyError(error: { status?: number; code?: string; message?: string } | null): string {
  if (!error) return "Something went wrong. Please try again.";
  if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don't match.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with this email already exists. Try signing in.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 10 characters for your password.";
    case "INVALID_EMAIL":
      return "Enter a valid email address.";
    default:
      return error.message || "Something went wrong. Please try again.";
  }
}

function passwordScore(pw: string): number {
  if (!pw) return 0;
  let score = Math.min(2, Math.floor(pw.length / 6));
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(4, Math.max(1, score - (pw.length < 10 ? 2 : 0)));
}

const STRENGTH = ["", "Weak", "Fair", "Good", "Strong"];

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[mode];
  const score = passwordScore(password);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (mode === "sign-up" && password.length < 10) {
      setError("Use at least 10 characters for your password.");
      return;
    }
    setPending(true);
    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
    if (result.error) {
      setPending(false);
      setError(friendlyError(result.error));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <motion.div variants={stagger(0.07, 0.05)} initial="hidden" animate="show" className="w-full max-w-[400px]">
      <motion.h1 variants={fadeUp} className="font-display text-[44px] leading-none tracking-[-0.02em] text-ink sm:text-5xl">
        {copy.title}
      </motion.h1>
      <motion.p variants={fadeUp} className="mt-3 text-[15px] text-ink-soft">
        {copy.subtitle}
      </motion.p>

      <motion.form variants={fadeUp} onSubmit={onSubmit} className="mt-9 space-y-4" noValidate>
        {mode === "sign-up" && (
          <Field label="Name" htmlFor="name">
            <Input
              id="name"
              autoComplete="name"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<UserRound className="size-4" />}
              placeholder="Ada Lovelace"
            />
          </Field>
        )}
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="size-4" />}
            placeholder="you@example.com"
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          hint={mode === "sign-up" ? "At least 10 characters" : undefined}
        >
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              required
              minLength={mode === "sign-up" ? 10 : undefined}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<LockKeyhole className="size-4" />}
              className="pr-11"
              placeholder="••••••••••"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-muted transition-colors hover:text-ink"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {mode === "sign-up" && (
            <div className="flex items-center gap-3 pt-1" aria-live="polite">
              <div className="grid flex-1 grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className="h-1 overflow-hidden rounded-full bg-surface-sunken">
                    <motion.span
                      className={cn(
                        "block h-full origin-left rounded-full",
                        score <= 1 ? "bg-danger" : score === 2 ? "bg-restricted" : "bg-public",
                      )}
                      initial={false}
                      animate={{ scaleX: score >= i ? 1 : 0 }}
                      transition={{ duration: 0.35, ease }}
                    />
                  </span>
                ))}
              </div>
              <span className="w-12 text-right text-xs text-ink-muted">{STRENGTH[score]}</span>
            </div>
          )}
        </Field>

        <AnimatePresence>
          {error && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <span className="block rounded-xl border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-[13.5px] text-danger">
                {error}
              </span>
            </motion.p>
          )}
        </AnimatePresence>

        <Button type="submit" size="lg" loading={pending} className="group mt-2 w-full">
          {copy.cta}
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Button>
      </motion.form>

      <motion.p variants={fadeUp} className="mt-8 text-center text-sm text-ink-muted">
        {mode === "sign-in" ? "New to Aether? " : "Already have a vault? "}
        <Link
          href={`${mode === "sign-in" ? "/sign-up" : "/sign-in"}${params.get("next") ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-medium text-ink underline decoration-gold-bright decoration-2 underline-offset-4 transition-colors hover:text-gold"
        >
          {mode === "sign-in" ? "Create an account" : "Sign in"}
        </Link>
      </motion.p>
    </motion.div>
  );
}
