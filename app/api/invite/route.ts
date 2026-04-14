import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

// GET /api/invite?query=john&workspaceId=xxx
// Searches all profiles by name or email, excludes existing members
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('query')?.trim()
  const workspaceId = searchParams.get('workspaceId')

  if (!query || !workspaceId) {
    return NextResponse.json({ users: [] })
  }

  // Get existing member user_ids to exclude them
  const { data: existingMembers } = await supabaseAdmin
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)

  const excludeIds = (existingMembers || []).map((m: any) => m.user_id)

  // Search profiles by full_name or email
  const { data: users } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(8)

  // Filter out existing members
  const filtered = (users || []).filter((u: any) => !excludeIds.includes(u.id))

  return NextResponse.json({ users: filtered })
}

// POST /api/invite — smart invite
// If user exists → add directly + send notification email + in-app notification
// If user doesn't exist → send invite email via Resend
export async function POST(request: Request) {
  const { email, role, workspaceId, workspaceSlug, workspaceName, existingUserId } = await request.json()

  if (!email || !workspaceId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://devboardapp.vercel.app'

  // --- EXISTING USER: add directly + send notification ---
  if (existingUserId) {
    const { error: addError } = await supabaseAdmin
      .from('workspace_members')
      .insert({ workspace_id: workspaceId, user_id: existingUserId, role: role || 'member' })

    if (addError) {
      return NextResponse.json({ error: addError.message }, { status: 400 })
    }

    // Create in-app notification
    await supabaseAdmin.from('notifications').insert({
      user_id: existingUserId,
      type: 'workspace_invite',
      message: `You've been added to workspace "${workspaceName}"`,
      link: `/workspace/${workspaceSlug}`,
      read: false,
    })

    // Send confirmation email via Resend
    await resend.emails.send({
      from: 'DevBoard <noreply@devboardapp.vercel.app>',
      to: email,
      subject: `You've been added to "${workspaceName}" on DevBoard`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:12px;">
          <h2 style="margin:0 0 8px">You've been added to a workspace 🎉</h2>
          <p style="color:#aaa;margin:0 0 24px">You now have access to <strong style="color:#fff">${workspaceName}</strong> on DevBoard as a <strong style="color:#fff">${role || 'member'}</strong>.</p>
          <a href="${appUrl}/workspace/${workspaceSlug}" 
             style="display:inline-block;background:#fff;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Open Workspace →
          </a>
        </div>
      `,
    })

    return NextResponse.json({ success: true, type: 'added' })
  }

  // --- NEW USER: store pending invite + send invite email via Resend ---
  const { error: inviteDbError } = await supabaseAdmin
    .from('workspace_invites')
    .upsert({
      email: email.toLowerCase(),
      workspace_id: workspaceId,
      role: role || 'member',
    })

  if (inviteDbError) {
    return NextResponse.json({ error: inviteDbError.message }, { status: 400 })
  }

  const inviteLink = `${appUrl}/signup?workspaceId=${workspaceId}&workspaceSlug=${workspaceSlug}`

  const { error: emailError } = await resend.emails.send({
    from: 'DevBoard <noreply@devboardapp.vercel.app>',
    to: email,
    subject: `You're invited to join "${workspaceName}" on DevBoard`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0a;color:#fff;border-radius:12px;">
        <h2 style="margin:0 0 8px">You're invited! 🚀</h2>
        <p style="color:#aaa;margin:0 0 24px">You've been invited to join <strong style="color:#fff">${workspaceName}</strong> on DevBoard as a <strong style="color:#fff">${role || 'member'}</strong>.</p>
        <a href="${inviteLink}" 
           style="display:inline-block;background:#fff;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Accept Invite →
        </a>
        <p style="color:#555;font-size:12px;margin-top:24px;">If you don't have an account yet, you'll be asked to create one first.</p>
      </div>
    `,
  })

  if (emailError) {
    return NextResponse.json({ error: emailError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, type: 'invited' })
}