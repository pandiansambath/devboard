'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function WorkspacePage() {
  const [user, setUser] = useState<any>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [showNew, setShowNew] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      loadWorkspace()
    })
  }, [slug])

  async function loadWorkspace() {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('*')
      .eq('slug', slug)
      .single()
    if (!ws) { router.push('/dashboard'); return }
    setWorkspace(ws)

    const { data: projs } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', ws.id)
      .order('created_at')
    if (projs) setProjects(projs)
    setLoading(false)
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    if (!projectName.trim() || !workspace) return
    const { data } = await supabase
      .from('projects')
      .insert({ name: projectName.trim(), description: projectDesc.trim(), workspace_id: workspace.id })
      .select()
      .single()
    if (data) {
      setProjects([...projects, data])
      setProjectName('')
      setProjectDesc('')
      setShowNew(false)
    }
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
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-white/40 hover:text-white transition text-sm">← Dashboard</Link>
          <span className="text-white/20">/</span>
          <span className="font-semibold">{workspace?.name}</span>
        </div>
        <span className="text-white/40 text-sm">{user?.user_metadata?.full_name}</span>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{workspace?.name}</h1>
            <p className="text-white/40 text-sm mt-1">Projects</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/90 transition"
          >
            + New project
          </button>
        </div>

        {showNew && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6"
          >
            <h3 className="font-semibold mb-4">New project</h3>
            <form onSubmit={createProject} className="flex flex-col gap-3">
              <input
                autoFocus
                type="text" placeholder="Project name" value={projectName}
                onChange={e => setProjectName(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition placeholder:text-white/30"
                required
              />
              <input
                type="text" placeholder="Description (optional)" value={projectDesc}
                onChange={e => setProjectDesc(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition placeholder:text-white/30"
              />
              <div className="flex gap-3">
                <button type="submit" className="bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/90 transition">
                  Create
                </button>
                <button type="button" onClick={() => setShowNew(false)} className="text-white/40 hover:text-white text-sm transition px-4 py-2">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {projects.length === 0 && !showNew ? (
          <div className="border border-white/10 rounded-2xl p-16 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-white/40 text-sm mb-6">Create your first project to start managing tasks!</p>
            <button
              onClick={() => setShowNew(true)}
              className="bg-white text-black px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/90 transition"
            >
              Create project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj, i) => (
              <motion.div
                key={proj.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/workspace/${slug}/project/${proj.id}`}>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/30 transition cursor-pointer group">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-lg mb-4 group-hover:bg-white/20 transition">
                      📋
                    </div>
                    <h3 className="font-semibold mb-1">{proj.name}</h3>
                    {proj.description && <p className="text-white/30 text-xs">{proj.description}</p>}
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