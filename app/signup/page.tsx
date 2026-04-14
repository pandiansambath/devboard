'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)   // ← NEW
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: 'https://devboardapp.vercel.app/auth/callback',
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)   // ← just flip this flag, no router.push
    }
  }

  // ── "Check your email" screen ──────────────────────────────────────────────
  if (sent) {
    return (
      <main className="min-h-screen bg-[#080808] text-white flex items-center justify-center">
        <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md text-center"
        >
          <div className="text-5xl mb-6">📧</div>
          <h2 className="text-2xl font-bold mb-3">Check your email!</h2>
          <p className="text-white/40 text-sm leading-relaxed">
            We sent a confirmation link to{' '}
            <span className="text-white font-medium">{email}</span>.<br />
            Click that link and you will be taken straight to your dashboard.
          </p>
          <p className="text-white/20 text-xs mt-6">
            Wrong email?{' '}
            <button
              onClick={() => setSent(false)}
              className="text-white/40 hover:text-white underline transition"
            >
              Go back
            </button>
          </p>
        </motion.div>
      </main>
    )
  }

  // ── Normal signup form ─────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#080808] text-white flex items-center justify-center">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <Link href="/" className="block text-center text-xl font-bold mb-10">DevBoard</Link>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-1">Create account</h1>
          <p className="text-white/40 text-sm mb-8">Start collaborating with your team</p>
          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <input
              type="text" placeholder="Full name" value={name}
              onChange={e => setName(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition placeholder:text-white/30"
              required
            />
            <input
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition placeholder:text-white/30"
              required
            />
            <input
              type="password" placeholder="Password (min 6 chars)" value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition placeholder:text-white/30"
              required
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="bg-white text-black py-3 rounded-xl text-sm font-semibold hover:bg-white/90 transition disabled:opacity-40 mt-2"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          <p className="text-white/30 text-xs mt-6 text-center">
            Have account?{' '}
            <Link href="/login" className="text-white/60 hover:text-white transition">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </main>
  )
}