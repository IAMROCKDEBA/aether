"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Ban,
  CloudUpload,
  FileLock2,
  Fingerprint,
  Gauge,
  History,
  KeyRound,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { PermissionOrbit } from "@/components/files/permission-orbit";
import { VISIBILITY_META } from "@/components/files/visibility";
import { ease, fadeUp, stagger } from "@/components/motion/presets";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { trackSpotlight } from "@/lib/spotlight";
import { VISIBILITIES, type Visibility } from "@/lib/types";
import { AetherShader } from "./aether-shader";
import { HeroPreview } from "./hero-preview";

export function Landing({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="relative overflow-x-clip">
      <Nav signedIn={signedIn} />
      <Hero signedIn={signedIn} />
      <AccessLevels />
      <TemporaryLinks />
      <Security />
      <Closing signedIn={signedIn} />
    </div>
  );
}

function Nav({ signedIn }: { signedIn: boolean }) {
  const { scrollY } = useScroll();
  const backdrop = useTransform(scrollY, [0, 80], [0, 1]);
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div
        style={{ opacity: backdrop }}
        className="absolute inset-0 border-b border-line bg-canvas/70 backdrop-blur-2xl"
      />
      <nav className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-[72px] sm:px-8">
        <Link href="/" aria-label="Aether home" className="rounded-lg">
          <Logo />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Button asChild size="sm">
              <Link href="/files">
                Open vault <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

function Hero({ signedIn }: { signedIn: boolean }) {
  const { scrollY } = useScroll();
  const fade = useTransform(scrollY, [0, 500], [1, 0]);
  const lift = useTransform(scrollY, [0, 500], [0, -60]);

  return (
    <section className="relative flex min-h-[100svh] items-center pt-24 pb-16 sm:pt-28">
      <AetherShader />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-canvas" />

      <motion.div
        style={{ opacity: fade, y: lift }}
        className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-6"
      >
        <motion.div variants={stagger(0.09, 0.1)} initial="hidden" animate="show" className="max-w-2xl">
          <motion.p
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-raised/60 py-1.5 pr-3.5 pl-2 text-[12.5px] text-ink-soft backdrop-blur-xl"
          >
            <span className="grid size-5 place-items-center rounded-full bg-ink text-ink-inverse">
              <ShieldCheck className="size-3" />
            </span>
            Private by default · Stored on Amazon S3
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="mt-7 font-display text-[clamp(3.2rem,8.4vw,6.6rem)] leading-[0.92] tracking-[-0.025em] text-ink"
          >
            Every file,
            <br />
            <em className="text-gilded pr-2">exactly</em> as shared.
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-7 max-w-[34rem] text-[17px] leading-relaxed text-ink-soft sm:text-lg">
            Upload once, then decide precisely who may open each file: only you, the people you choose, or
            anyone. Hand out temporary links that expire, lock with a password, and stop on command.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild variant="gold" size="lg" className="group">
              <Link href={signedIn ? "/files" : "/sign-up"}>
                {signedIn ? "Open your vault" : "Create your vault"}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </Button>
            {!signedIn && (
              <Button asChild variant="secondary" size="lg">
                <Link href="/sign-in">I have an account</Link>
              </Button>
            )}
          </motion.div>
        </motion.div>

        <HeroPreview />
      </motion.div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <motion.div
      variants={stagger(0.08)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className="max-w-2xl"
    >
      <motion.p variants={fadeUp} className="font-mono text-[11.5px] font-medium tracking-[0.22em] text-gold uppercase">
        {eyebrow}
      </motion.p>
      <motion.h2
        variants={fadeUp}
        className="mt-4 font-display text-[clamp(2.4rem,5.2vw,4rem)] leading-[1] tracking-[-0.02em] text-ink"
      >
        {title}
      </motion.h2>
      {children && (
        <motion.p variants={fadeUp} className="mt-5 text-[17px] leading-relaxed text-ink-soft">
          {children}
        </motion.p>
      )}
    </motion.div>
  );
}

function AccessLevels() {
  const [level, setLevel] = useState<Visibility>("PRIVATE");
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      setLevel((l) => VISIBILITIES[(VISIBILITIES.indexOf(l) + 1) % VISIBILITIES.length]!);
    }, 3800);
    return () => clearInterval(id);
  }, [auto]);

  return (
    <section className="relative px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Access control" title={<>Three levels. <em>One</em> switch.</>}>
            Every file carries exactly one visibility. Change it and access changes everywhere, instantly: invitations
            and temporary links pause the moment a file goes private.
          </SectionHeading>

          <div role="tablist" aria-label="Visibility levels" className="mt-10 space-y-2.5">
            {VISIBILITIES.map((v) => {
              const meta = VISIBILITY_META[v];
              const Icon = meta.icon;
              const active = v === level;
              return (
                <button
                  key={v}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setAuto(false);
                    setLevel(v);
                  }}
                  className={cn(
                    "relative flex w-full items-start gap-4 rounded-2xl p-4 text-left transition-colors duration-300",
                    !active && "hover:bg-surface/60",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="level-highlight"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                      className="edge-light absolute inset-0 rounded-2xl border border-line bg-raised shadow-md"
                    />
                  )}
                  <span className={cn("relative grid size-10 shrink-0 place-items-center rounded-xl", meta.bg, meta.text)}>
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="relative">
                    <span className="flex items-baseline gap-2">
                      <span className="font-medium text-ink">{meta.label}</span>
                      <span className="text-[13px] text-ink-muted">{meta.short}</span>
                    </span>
                    <span className="mt-1 block text-[14.5px] leading-relaxed text-ink-soft">{meta.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="pearl absolute inset-[8%] rounded-full opacity-70 blur-3xl" />
          <PermissionOrbit level={level} className="relative" />
          <AnimatePresence mode="wait">
            <motion.p
              key={level}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease }}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 font-mono text-[11.5px] tracking-[0.2em] text-ink-muted uppercase"
            >
              {VISIBILITY_META[level].short}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

const LINK_FEATURES = [
  { icon: TimerReset, title: "Expires on schedule", body: "One hour, a day, a week, or your own date. After that the link simply stops." },
  { icon: KeyRound, title: "Optional password", body: "Hashed on the server and rate-limited, so guessing is pointless." },
  { icon: Gauge, title: "Download limits", body: "Allow one download or a hundred. Counting is atomic: no race can exceed it." },
  { icon: Ban, title: "Revoke instantly", body: "Changed your mind? One click and the link is dead, everywhere, immediately." },
];

function TemporaryLinks() {
  return (
    <section className="relative px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Restricted sharing" title={<>Links that <em>know</em> when to leave.</>}>
          Share with anyone, without accounts, for exactly as long as you intend.
        </SectionHeading>
        <motion.div
          variants={stagger(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {LINK_FEATURES.map(({ icon: Icon, title, body }) => (
            <motion.article
              key={title}
              variants={fadeUp}
              onPointerMove={trackSpotlight}
              className="spotlight edge-light relative rounded-3xl border border-line bg-surface p-6 shadow-sm"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-gold-soft text-gold">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <h3 className="mt-6 text-[17px] font-medium text-ink">{title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{body}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

const SECURITY = [
  {
    icon: FileLock2,
    title: "The bucket is never public",
    body: "S3 Block Public Access stays on. Every view is authorised by Aether, then served through a presigned URL that lives for seconds or minutes.",
    wide: true,
  },
  { icon: CloudUpload, title: "Direct-to-S3 uploads", body: "Signed POST policies pin each file's exact size and type; S3 rejects anything else." },
  { icon: Fingerprint, title: "Tokens you can't steal from a dump", body: "Links are stored as SHA-256 hashes and AES-GCM seals, never in plain text." },
  { icon: History, title: "Every access, accounted for", body: "See who opened what, through which link, and when." },
  {
    icon: ShieldCheck,
    title: "Hardened sessions",
    body: "httpOnly cookies, origin checks, strict CSP, rate-limited sign-in and scrypt password hashing.",
    wide: true,
  },
];

function Security() {
  return (
    <section className="relative px-5 py-20 sm:px-8 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Security" title={<>Engineered to be <em>boringly</em> safe.</>} />
        <motion.div
          variants={stagger(0.07)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="mt-14 grid gap-4 md:grid-cols-3"
        >
          {SECURITY.map(({ icon: Icon, title, body, wide }) => (
            <motion.article
              key={title}
              variants={fadeUp}
              onPointerMove={trackSpotlight}
              className={cn(
                "spotlight edge-light relative flex flex-col justify-between gap-10 rounded-3xl border border-line bg-surface p-7 shadow-sm",
                wide && "md:col-span-2",
              )}
            >
              <Icon className="size-6 text-gold" strokeWidth={1.5} />
              <div>
                <h3 className="font-display text-[26px] leading-tight text-ink">{title}</h3>
                <p className="mt-2 max-w-lg text-[14.5px] leading-relaxed text-ink-soft">{body}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Closing({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative px-5 pt-16 pb-10 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 1, ease }}
        className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] bg-[#16141a] px-6 py-20 text-center text-[#f0eee9] ring-1 ring-white/5 sm:py-28"
      >
        <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_120%,rgb(220_192_138/0.35),transparent_70%)]" />
        <div className="relative">
          <h2 className="font-display text-[clamp(2.6rem,6vw,5rem)] leading-[0.95] tracking-[-0.02em]">
            Your files. <em className="text-[#e9d2a0]">Your rules.</em>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[17px] opacity-70">Create a vault in seconds. Every file starts private.</p>
          <Button asChild variant="gold" size="lg" className="group mt-10">
            <Link href={signedIn ? "/files" : "/sign-up"}>
              {signedIn ? "Open your vault" : "Start for free"}
              <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Button>
        </div>
      </motion.div>
      <footer className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-4 px-2 text-[13px] text-ink-muted sm:flex-row">
        <Logo className="scale-90 opacity-80" />
        <p>Cloud file sharing &amp; permission management · Amazon S3</p>
      </footer>
    </section>
  );
}
