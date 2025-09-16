"use client"

import { motion } from "framer-motion"

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }))

  return (
    <svg
      className="w-full h-full text-primary dark:text-[#F3C623]"
      viewBox="0 0 696 316"
      fill="none"
    >
      {paths.map((path) => (
        <motion.path
          key={path.id}
          d={path.d}
          stroke="currentColor"
          strokeWidth={path.width}
          strokeOpacity={0.1 + path.id * 0.03}
          initial={{ pathLength: 0.3, opacity: 0.6 }}
          animate={{
            pathLength: 1,
            opacity: [0.3, 0.6, 0.3],
            pathOffset: [0, 1, 0],
          }}
          transition={{
            duration: 20 + Math.random() * 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </svg>
  )
}

export default function BackgroundPaths() {
  return (
    <div
      data-background-paths
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white/40 to-white/20 dark:from-neutral-950 dark:via-neutral-900/80 dark:to-neutral-800/60" />
      <div className="absolute inset-0">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
      </div>
    </div>
  )
}
