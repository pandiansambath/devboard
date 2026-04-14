'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

export default function WorkspacePage() {
  const [user, setUser] = useState<any>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [showNew, setShowNew] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectDesc, setProjectDesc] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState('')
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      loadWorkspace(data.user.id)
    })
  }, [slug])

  async function loadWorkspace(userId: string) {
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

    const { data: mems } = await supabase
      .from('workspace_members')
      .select('*, profiles(full_name, avatar_url)')
      .eq('workspace_id', ws.id)
    if (mems) {
      setMembers(mems)
      const me = mems.find((m: any) => m.user_id === userId)
      setUserRole(me?.role || 'member')
    }

    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
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

// REPLACE your existing handleInvite function with this:

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim() || !workspace) return
    setInviteLoading(true)
    setInviteMsg('')

    // Check if already a member
    const alreadyMember = members.find(m => m.profiles?.email === inviteEmail)
    if (alreadyMember) {
      setInviteMsg('error:This person is already a member!')
      setInviteLoading(false)
      return
    }

    // Call our API route which sends the real email
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail,
        role: inviteRole,
        workspaceId: workspace.id,
        workspaceSlug: workspace.slug,
        workspaceName: workspace.name,
      }),
    })

    const data = await res.json()

    if (data.error) {
      setInviteMsg(`error:${data.error}`)
    } else {
      setInviteMsg(`success:Invite sent to ${inviteEmail}! They will get an email with a link to join.`)
      setInviteEmail('')
    }

    setInviteLoading(false)
  }



  async function removeMember(memberId: string) {
    if (userRole !== 'admin') return
    await supabase.from('workspace_members').delete().eq('id', memberId)
    setMembers(members.filter(m => m.id !== memberId))
  }

  async function changeRole(memberId: string, newRole: string) {
    if (userRole !== 'admin') return
    await supabase.from('workspace_members').update({ role: newRole }).eq('id', memberId)
    setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m))
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowMembers(!showMembers); setShowInvite(false) }}
            className="text-sm text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition"
          >
            Members ({members.length})
          </button>
          {userRole === 'admin' && (
            <button
              onClick={() => { setShowInvite(!showInvite); setShowMembers(false) }}
              className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition"
            >
              + Invite
            </button>
          )}
          <span className="text-white/40 text-sm">{user?.user_metadata?.full_name}</span>
          <button onClick={handleLogout} className="text-sm text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition">
            Logout
          </button>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-8 py-12">

        {/* invite panel */}
        <AnimatePresence>
          {showInvite && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6"
            >
              <h3 className="font-semibold mb-1">Invite to workspace</h3>
              <p className="text-white/30 text-xs mb-4">Invite someone to join {workspace?.name}</p>
              <form onSubmit={handleInvite} className="flex flex-col gap-3">
                <input
                  type="email" placeholder="Email address" value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition placeholder:text-white/30"
                  required
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition text-white"
                >
                  <option value="member" className="bg-black">Member — can add/move tasks, comment</option>
                  <option value="viewer" className="bg-black">Viewer — read only</option>
                  <option value="admin" className="bg-black">Admin — full access</option>
                </select>
                {inviteMsg && (
                  <p className={`text-xs px-3 py-2 rounded-lg ${inviteMsg.startsWith('success:') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {inviteMsg.replace('success:', '').replace('error:', '')}
                  </p>
                )}
                <div className="flex gap-3">
                  <button type="submit" disabled={inviteLoading} className="bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/90 transition disabled:opacity-40">
                    {inviteLoading ? 'Sending...' : 'Send invite'}
                  </button>
                  <button type="button" onClick={() => { setShowInvite(false); setInviteMsg('') }} className="text-white/40 hover:text-white text-sm transition px-4 py-2">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* members panel */}
        <AnimatePresence>
          {showMembers && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6"
            >
              <h3 className="font-semibold mb-4">Members ({members.length})</h3>
              <div className="flex flex-col gap-3">
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm font-medium">
                        {(m.profiles?.full_name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{m.profiles?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-white/30">{m.role}</p>
                      </div>
                    </div>
                    {userRole === 'admin' && m.user_id !== user?.id && (
                      <div className="flex items-center gap-2">
                        <select
                          value={m.role}
                          onChange={e => changeRole(m.id, e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none"
                        >
                          <option value="viewer" className="bg-black">Viewer</option>
                          <option value="member" className="bg-black">Member</option>
                          <option value="admin" className="bg-black">Admin</option>
                        </select>
                        <button
                          onClick={() => removeMember(m.id)}
                          className="text-xs text-red-400/60 hover:text-red-400 border border-red-400/10 hover:border-red-400/30 px-2 py-1 rounded-lg transition"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {m.user_id === user?.id && (
                      <span className="text-xs text-white/20 bg-white/5 px-2 py-1 rounded-lg">You</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{workspace?.name}</h1>
            <p className="text-white/40 text-sm mt-1">Projects · {userRole}</p>
          </div>
          {(userRole === 'admin' || userRole === 'member') && (
            <button
              onClick={() => setShowNew(true)}
              className="bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/90 transition"
            >
              + New project
            </button>
          )}
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