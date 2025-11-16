"use client"

import { useEffect, useRef } from "react"

export default function StakePage() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.log("Autoplay blocked:", error)
      })
    }
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        loop
        muted={false}
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/meme.m4" type="video/mp4" />
      </video>
    </div>
  )
}

