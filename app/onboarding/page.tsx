'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function Onboarding() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function createWorkspace(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    const { data: workspace, error: wErr } = await supabase
      .from('workspaces')
      .insert({ name: name.trim(), slug, created_by: user.id })
      .select()
      .single()

    if (wErr) { setError(wErr.message); setLoading(false); return }

    // add creator as admin member
    await supabase.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'admin'
    })

    router.push(`/dashboard`)
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white flex items-center justify-center">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-10">
          <div className="text-4xl mb-4">🏢</div>
          <h1 className="text-2xl font-bold mb-2">Create your workspace</h1>
          <p className="text-white/40 text-sm">This is where your team will collaborate</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <form onSubmit={createWorkspace} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-white/40 mb-2 block">Workspace name</label>
              <input
                type="text"
                placeholder="e.g. My Startup, Design Team..."
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition placeholder:text-white/30"
                required
              />
              {name && (
                <p className="text-white/30 text-xs mt-2">
                  URL: /workspace/{name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
                </p>
              )}
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              type="submit" disabled={loading || !name.trim()}
              className="bg-white text-black py-3 rounded-xl text-sm font-semibold hover:bg-white/90 transition disabled:opacity-40 mt-2"
            >
              {loading ? 'Creating...' : 'Create workspace →'}
            </button>
          </form>
        </div>
      </motion.div>
    </main>
  )
}