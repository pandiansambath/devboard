'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

export default function Home() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const cursorDotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 20}px)`
      }
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`
      }
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <main className="min-h-screen bg-[#080808] text-white overflow-hidden cursor-none">
      {/* custom cursor */}
      <div ref={cursorRef} className="fixed top-0 left-0 w-10 h-10 border border-white/30 rounded-full pointer-events-none z-50 transition-transform duration-100 ease-out" />
      <div ref={cursorDotRef} className="fixed top-0 left-0 w-2 h-2 bg-white rounded-full pointer-events-none z-50 transition-transform duration-75 ease-out" />

      {/* grid background */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* nav */}
      <nav className="relative z-10 flex justify-between items-center px-8 py-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl font-bold tracking-tight"
        >
          DevBoard
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex gap-4"
        >
          <Link href="/login" className="text-sm text-white/60 hover:text-white transition px-4 py-2">
            Login
          </Link>
          <Link href="/signup" className="text-sm bg-white text-black px-4 py-2 rounded-lg hover:bg-white/90 transition font-medium">
            Get started
          </Link>
        </motion.div>
      </nav>

      {/* hero */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm text-white/60 mb-8"
        >
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          Real-time team collaboration
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-7xl font-bold tracking-tight mb-6 leading-none"
        >
          Ship faster,
          <br />
          <span className="text-white/30">together.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-white/50 text-xl max-w-md mb-12"
        >
          Kanban boards, real-time updates, team workspaces. Everything your team needs.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex gap-4"
        >
          <Link
            href="/signup"
            className="bg-white text-black px-8 py-3.5 rounded-xl font-semibold hover:bg-white/90 transition text-sm"
          >
            Start for free
          </Link>
          <Link
            href="/login"
            className="border border-white/20 text-white/70 px-8 py-3.5 rounded-xl font-medium hover:border-white/40 hover:text-white transition text-sm"
          >
            Sign in →
          </Link>
        </motion.div>
      </div>
    </main>
  )
}