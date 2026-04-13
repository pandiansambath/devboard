'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      loadWorkspaces(data.user.id)
    })
  }, [])

  async function loadWorkspaces(userId: string) {
    const { data } = await supabase
      .from('workspace_members')
      .select('workspace_id, role, workspaces(*)')
      .eq('user_id', userId)
    if (data) setWorkspaces(data.map((d: any) => ({ ...d.workspaces, role: d.role })))
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <nav className="relative z-10 border-b border-white/5 px-8 py-4 flex justify-between items-center">
        <span className="font-bold">DevBoard</span>
        <div className="flex items-center gap-4">
          <span className="text-white/40 text-sm">{user?.user_metadata?.full_name}</span>
          <button onClick={handleLogout} className="text-sm text-white/40 hover:text-white transition">
            Logout
          </button>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your workspaces</h1>
            <p className="text-white/40 text-sm mt-1">Select a workspace to get started</p>
          </div>
          <Link
            href="/onboarding"
            className="bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/90 transition"
          >
            + New workspace
          </Link>
        </div>

        {workspaces.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-white/10 rounded-2xl p-16 text-center"
          >
            <div className="text-4xl mb-4">🏢</div>
            <h2 className="text-xl font-semibold mb-2">No workspaces yet</h2>
            <p className="text-white/40 text-sm mb-6">Create your first workspace to get started</p>
            <Link
              href="/onboarding"
              className="bg-white text-black px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/90 transition inline-block"
            >
              Create workspace
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws, i) => (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/workspace/${ws.slug}`}>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/30 hover:bg-white/8 transition cursor-pointer group">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:bg-white/20 transition">
                      {ws.name[0].toUpperCase()}
                    </div>
                    <h3 className="font-semibold mb-1">{ws.name}</h3>
                    <p className="text-white/30 text-xs">{ws.role}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}