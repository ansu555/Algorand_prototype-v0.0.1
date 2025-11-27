"use client"

import { useEffect, useRef } from "react"

export default function StakePage() {
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.log("Autoplay blocked:", error)
      })
    }
  }, [])

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black flex flex-col items-center justify-center gap-8 p-8">
      {/* Message */}
      <div className="text-center z-10 max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-black text-white mb-4" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
          Most Advanced DEX is Under Cooking! 🚀
        </h1>
        <p className="text-xl md:text-3xl text-yellow-400 font-bold" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
          Good things take time... Till then, enjoy this banger! 🎵
        </p>
      </div>

      {/* Rick Astley GIF */}
      <img
        src="https://media.giphy.com/media/Vuw9m5wXviFIQ/giphy.gif"
        alt="Never Gonna Give You Up"
        className="max-h-[60vh] max-w-full object-contain"
      />
      
      {/* Embedded YouTube video (hidden, audio only) */}
      <iframe
        width="0"
        height="0"
        src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&loop=1&playlist=dQw4w9WgXcQ"
        allow="autoplay; encrypted-media"
        style={{ position: 'absolute', top: -9999, left: -9999 }}
      />
    </div>
  )
}
