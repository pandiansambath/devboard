'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const COLUMNS = ['todo', 'in-progress', 'done']
const LABELS: Record<string, string> = { 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done' }
const COL_STYLES: Record<string, { badge: string; bg: string }> = {
  'todo':        { badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',   bg: 'bg-blue-500/5 border-blue-500/20' },
  'in-progress': { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', bg: 'bg-amber-500/5 border-amber-500/20' },
  'done':        { badge: 'bg-green-500/10 text-green-400 border-green-500/20', bg: 'bg-green-500/5 border-green-500/20' },
}

export default function ProjectPage() {
  const [user, setUser] = useState<any>(null)
  const [project, setProject] = useState<any>(null)
  const [workspace, setWorkspace] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<any>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [showActivity, setShowActivity] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newTask, setNewTask] = useState('')
  const cursorEl = useRef<HTMLDivElement>(null)
  const cursorDot = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const projectId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
      loadData()
    })

    const actChannel = supabase.channel('activity-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, (payload) => {
        setActivityLog(prev => [payload.new, ...prev].slice(0, 20))
      })
      .subscribe()

    const onMouseMove = (e: MouseEvent) => {
      if (cursorEl.current) cursorEl.current.style.transform = `translate(${e.clientX - 16}px,${e.clientY - 16}px)`
      if (cursorDot.current) cursorDot.current.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 3}px)`
    }
    window.addEventListener('mousemove', onMouseMove)

    return () => {
      supabase.removeChannel(actChannel)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [projectId])

  async function loadData() {
    const { data: proj } = await supabase.from('projects').select('*, workspaces(*)').eq('id', projectId).single()
    if (!proj) { router.push('/dashboard'); return }
    setProject(proj)
    setWorkspace((proj as any).workspaces)
    await loadTasks()
    await loadActivity()
    setLoading(false)
  }

  async function loadTasks() {
    const { data } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('position')
    if (data) setTasks(data)
  }

  async function loadActivity() {
    const { data } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(20)
    if (data) setActivityLog(data)
  }

  async function loadComments(taskId: string) {
    const { data } = await supabase.from('comments').select('*, profiles(full_name)').eq('task_id', taskId).order('created_at')
    if (data) setComments(data)
  }

  async function logActivity(action: string, entityType: string, entityId: string) {
    if (!user || !workspace) return
    await supabase.from('activity_log').insert({ workspace_id: workspace.id, user_id: user.id, action, entity_type: entityType, entity_id: entityId })
  }

  async function addTask() {
    if (!newTask.trim() || !user || !addingTo) return
    const col = addingTo
    const title = newTask.trim()
    const tempId = 'temp-' + Date.now()
    const tempTask = { id: tempId, title, status: col, project_id: projectId, created_by: user.id, position: tasks.filter(t => t.status === col).length }
    setTasks(prev => [...prev, tempTask])
    setNewTask('')
    setAddingTo(null)
    const { data } = await supabase.from('tasks').insert({ title, status: col, created_by: user.id, project_id: projectId, position: tempTask.position }).select().single()
    if (data) {
      setTasks(prev => prev.map(t => t.id === tempId ? data : t))
      logActivity(`created task "${title}"`, 'task', data.id)
    }
  }

  async function moveTask(taskId: string, newStatus: string) {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    if (selectedTask?.id === taskId) setSelectedTask((p: any) => ({ ...p, status: newStatus }))
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    if (task) logActivity(`moved "${task.title}" to ${LABELS[newStatus]}`, 'task', taskId)
  }

  async function deleteTask(taskId: string) {
    const task = tasks.find(t => t.id === taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    if (selectedTask?.id === taskId) setSelectedTask(null)
    await supabase.from('tasks').delete().eq('id', taskId)
    if (task) logActivity(`deleted task "${task.title}"`, 'task', taskId)
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || !user || !selectedTask) return
    const body = newComment.trim()
    setNewComment('')
    setReplyTo(null)
    await supabase.from('comments').insert({ task_id: selectedTask.id, user_id: user.id, body, parent_id: replyTo || null })
    logActivity(`commented on "${selectedTask.title}"`, 'comment', selectedTask.id)
    loadComments(selectedTask.id)
  }

  function openTask(task: any) {
    setSelectedTask(task)
    loadComments(task.id)
  }

  // drag handlers using HTML5 drag API
  function onDragStart(e: React.DragEvent, task: any) {
    setDragging(task)
    e.dataTransfer.effectAllowed = 'move'
    const ghost = document.createElement('div')
    ghost.textContent = task.title
    ghost.style.cssText = 'position:fixed;top:-100px;background:#1a1a1a;color:white;padding:12px 16px;border-radius:12px;font-size:14px;border:1px solid rgba(255,255,255,0.2);max-width:200px;'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, 60, 20)
    setTimeout(() => document.body.removeChild(ghost), 0)
  }

  function onDragOver(e: React.DragEvent, col: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverCol(col)
  }

  function onDrop(e: React.DragEvent, col: string) {
    e.preventDefault()
    if (dragging && dragging.status !== col) moveTask(dragging.id, col)
    setDragging(null)
    setOverCol(null)
  }

  function onDragEnd() {
    setDragging(null)
    setOverCol(null)
  }

  function timeAgo(ts: string) {
    const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    return `${Math.floor(m / 60)}h ago`
  }

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  return (
    <main className="min-h-screen bg-[#080808] text-white flex flex-col overflow-hidden cursor-none">
      <div ref={cursorEl} className="fixed top-0 left-0 w-8 h-8 border border-white/25 rounded-full pointer-events-none z-[999]" style={{ willChange: 'transform' }} />
      <div ref={cursorDot} className="fixed top-0 left-0 w-1.5 h-1.5 bg-white rounded-full pointer-events-none z-[999]" style={{ willChange: 'transform' }} />
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:56px_56px]" />

      <nav className="relative z-10 border-b border-white/5 px-8 py-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="text-white/25 hover:text-white transition">Dashboard</Link>
          <span className="text-white/10">/</span>
          <Link href={`/workspace/${slug}`} className="text-white/25 hover:text-white transition">{workspace?.name}</Link>
          <span className="text-white/10">/</span>
          <span className="text-white/60">{project?.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setShowActivity(!showActivity); setSelectedTask(null) }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${showActivity ? 'border-white/30 text-white bg-white/5' : 'border-white/10 text-white/30 hover:text-white'}`}
          >
            Activity {activityLog.length > 0 && <span className="ml-1 bg-white/15 px-1.5 py-0.5 rounded-full">{activityLog.length}</span>}
          </button>
          <span className="text-white/25 text-sm">{user?.user_metadata?.full_name}</span>
        </div>
      </nav>

      <div className="relative z-10 flex flex-1 overflow-hidden">
        <div className={`flex-1 p-6 overflow-auto transition-all duration-300 ${selectedTask || showActivity ? 'mr-[400px]' : ''}`}>
          <div className="grid grid-cols-3 gap-4 min-h-[calc(100vh-80px)]">
            {COLUMNS.map(col => (
              <div
                key={col}
                onDragOver={e => onDragOver(e, col)}
                onDrop={e => onDrop(e, col)}
                onDragLeave={() => setOverCol(null)}
                className={`flex flex-col rounded-2xl border transition-all duration-200 ${overCol === col ? COL_STYLES[col].bg + ' border' : 'border-white/5 bg-white/1'}`}
              >
                <div className="px-4 pt-4 pb-3 flex items-center gap-2">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full border ${COL_STYLES[col].badge}`}>{LABELS[col]}</span>
                  <span className="text-white/20 text-xs">{tasks.filter(t => t.status === col).length}</span>
                </div>

                <div className="flex-1 px-3 pb-2 flex flex-col gap-2.5 min-h-[200px]">
                  <AnimatePresence>
                    {tasks.filter(t => t.status === col).map(task => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: dragging?.id === task.id ? 0.3 : 1, y: 0, scale: dragging?.id === task.id ? 0.95 : 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        draggable
                        onDragStart={e => onDragStart(e as any, task)}
                        onDragEnd={onDragEnd}
                        onClick={() => { if (!dragging) openTask(task) }}
                        className="bg-[#111] border border-white/8 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-white/20 hover:bg-white/4 transition-all group select-none"
                      >
                        <p className="text-sm leading-relaxed text-white/75 group-hover:text-white/90 transition">{task.title}</p>
                        <p className="text-xs text-white/15 mt-2 opacity-0 group-hover:opacity-100 transition">drag to move · click to open</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="px-3 pb-3">
                  {addingTo === col ? (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
                      <textarea
                        autoFocus value={newTask} onChange={e => setNewTask(e.target.value)}
                        placeholder="Task title..."
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 resize-none placeholder:text-white/20"
                        rows={2}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addTask() } if (e.key === 'Escape') setAddingTo(null) }}
                      />
                      <div className="flex gap-2">
                        <button onClick={addTask} className="bg-white text-black text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-white/90 transition">Add</button>
                        <button onClick={() => { setAddingTo(null); setNewTask('') }} className="text-white/30 hover:text-white text-xs transition">Cancel</button>
                      </div>
                    </motion.div>
                  ) : (
                    <button onClick={() => setAddingTo(col)} className="w-full text-left text-white/20 hover:text-white/50 text-sm py-2 px-2 rounded-xl hover:bg-white/5 transition">
                      + Add task
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* activity panel */}
        <AnimatePresence>
          {showActivity && !selectedTask && (
            <motion.div
              initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              className="fixed right-0 top-0 bottom-0 w-[400px] bg-[#0c0c0c] border-l border-white/8 z-20 flex flex-col"
            >
              <div className="p-6 border-b border-white/8 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Activity</h3>
                  <p className="text-white/30 text-xs mt-0.5">Everything happening in real-time</p>
                </div>
                <button onClick={() => setShowActivity(false)} className="text-white/20 hover:text-white transition">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {activityLog.length === 0 ? (
                  <p className="text-white/15 text-sm text-center mt-8">No activity yet. Start working!</p>
                ) : (
                  <div className="flex flex-col">
                    {activityLog.map((log, i) => (
                      <motion.div key={log.id || i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-3 py-3 border-b border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400/60 mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-white/60">{log.action}</p>
                          <p className="text-xs text-white/20 mt-0.5">{timeAgo(log.created_at)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* task detail panel */}
        <AnimatePresence>
          {selectedTask && (
            <motion.div
              initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              className="fixed right-0 top-0 bottom-0 w-[400px] bg-[#0c0c0c] border-l border-white/8 z-20 flex flex-col"
            >
              <div className="p-6 border-b border-white/8 flex justify-between items-start gap-4">
                <div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${COL_STYLES[selectedTask.status].badge} mb-3 inline-block`}>
                    {LABELS[selectedTask.status]}
                  </span>
                  <h2 className="font-semibold text-lg leading-snug">{selectedTask.title}</h2>
                </div>
                <button onClick={() => setSelectedTask(null)} className="text-white/20 hover:text-white transition mt-1 flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>

              <div className="p-6 border-b border-white/8">
                <p className="text-xs text-white/25 mb-3 uppercase tracking-wider font-medium">Move to</p>
                <div className="flex gap-2 flex-wrap">
                  {COLUMNS.filter(c => c !== selectedTask.status).map(c => (
                    <button key={c} onClick={() => moveTask(selectedTask.id, c)} className={`text-xs px-3 py-1.5 rounded-lg border transition hover:scale-105 ${COL_STYLES[c].badge}`}>
                      {LABELS[c]}
                    </button>
                  ))}
                  <button onClick={() => deleteTask(selectedTask.id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-500/15 text-red-400/50 hover:text-red-400 hover:border-red-500/40 transition ml-auto">
                    Delete
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-6">
                <p className="text-xs text-white/25 mb-4 uppercase tracking-wider font-medium">Comments ({comments.length})</p>
                {comments.length === 0 ? (
                  <p className="text-white/15 text-sm">No comments yet.</p>
                ) : (
                  <div className="flex flex-col gap-5">
                    {comments
                      .filter(c => !c.parent_id)
                      .map((c, i) => {
                        const replies = comments.filter(r => r.parent_id === c.id)

                        return (
                          <div key={c.id} className="flex flex-col gap-2">

                            {/* Parent comment */}
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04 }}
                              className="flex gap-3 items-start"
                            >
                              <div className="w-7 h-7 bg-white/8 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-medium border border-white/10">
                                {(c.profiles?.full_name || 'U')[0].toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-white/25 mb-1">{c.profiles?.full_name}</p>
                                <p className="text-sm text-white/65 leading-relaxed">{c.body}</p>
                                <button
                                  onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                                  className={`text-xs mt-1 transition ${replyTo === c.id ? 'text-white/60' : 'text-white/30 hover:text-white/60'}`}
                                >
                                  {replyTo === c.id ? '↩ Cancel reply' : 'Reply'}
                                </button>
                              </div>
                            </motion.div>

                            {/* Replies */}
                            {replies.length > 0 && (
                              <div className="flex flex-col gap-3 ml-10 pl-3 border-l border-white/8">
                                {replies.map(r => (
                                  <motion.div
                                    key={r.id}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex gap-3 items-start"
                                  >
                                    <div className="w-6 h-6 bg-white/5 rounded-full flex items-center justify-center text-xs border border-white/10 flex-shrink-0">
                                      {(r.profiles?.full_name || 'U')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-white/25 mb-1">{r.profiles?.full_name}</p>
                                      <p className="text-xs text-white/60 leading-relaxed">{r.body}</p>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            )}

                          </div>
                        )
                      })}
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-white/8">
                {replyTo && (
                  <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-xs text-white/30">
                      Replying to comment
                    </p>
                    <button onClick={() => setReplyTo(null)} className="text-xs text-white/20 hover:text-white/50 transition">
                      Cancel
                    </button>
                  </div>
                )}
                <form onSubmit={addComment} className="flex gap-3">
                  <input
                    value={newComment} onChange={e => setNewComment(e.target.value)}
                    placeholder={replyTo ? 'Write a reply...' : 'Add a comment...'}
                    className="flex-1 bg-white/4 border border-white/8 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-white/20 transition placeholder:text-white/15"
                  />
                  <button type="submit" disabled={!newComment.trim()} className="bg-white text-black px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-white/90 transition disabled:opacity-20">
                    Send
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}