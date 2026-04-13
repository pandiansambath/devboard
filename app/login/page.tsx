'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/dashboard')
  }

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
          <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
          <p className="text-white/40 text-sm mb-8">Sign in to your account</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition placeholder:text-white/30"
              required
            />
            <input
              type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition placeholder:text-white/30"
              required
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="bg-white text-black py-3 rounded-xl text-sm font-semibold hover:bg-white/90 transition disabled:opacity-40 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="text-white/30 text-xs mt-6 text-center">
            No account?{' '}
            <Link href="/signup" className="text-white/60 hover:text-white transition">Sign up</Link>
          </p>
        </div>
      </motion.div>
    </main>
  )
}