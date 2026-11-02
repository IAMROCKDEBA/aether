import type { Transition, Variants } from "motion/react";

// Critically damped springs: fast to settle, no wobble. Motion runs these on
// transform/opacity only, which stay on the compositor at the display's refresh rate.
export const spring = {
  snappy: { type: "spring", stiffness: 520, damping: 38, mass: 0.8 },
  smooth: { type: "spring", stiffness: 300, damping: 32, mass: 0.9 },
  gentle: { type: "spring", stiffness: 170, damping: 26, mass: 1 },
  sheet: { type: "spring", stiffness: 380, damping: 40, mass: 0.9 },
} satisfies Record<string, Transition>;

export const ease = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease } },
};

export const stagger = (delay = 0.06, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren } },
});
