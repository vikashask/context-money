import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

export default function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  duration = 0.6,
  className = "",
}) {
  const ref = useRef(null);
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => {
    if (v >= 1000) return Math.round(v).toLocaleString("en-IN");
    return v % 1 === 0 ? Math.round(v).toString() : v.toFixed(1);
  });

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration,
      ease: "easeOut",
    });
    return controls.stop;
  }, [value, duration, motionValue]);

  return (
    <span className={className}>
      {prefix}
      <motion.span ref={ref}>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
