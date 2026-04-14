import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This uses the SERVICE ROLE KEY — only works server-side, never exposed to browser
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  const { email, role, workspaceId, workspaceSlug, workspaceName } = await request.json()

  if (!email || !workspaceId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Store a pending invite in DB so when they sign up we auto-add them
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

  // Send the actual invite email via Supabase — they get a magic link
  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `https://devboardapp.vercel.app/auth/callback?workspaceId=${workspaceId}&workspaceSlug=${workspaceSlug}`,
    data: {
      invited_to_workspace: workspaceName,
    },
  })

  // If user already exists in Supabase, inviteUserByEmail errors
  // In that case, the pending invite in DB is enough — they'll be added on next login
  if (error && !error.message.includes('already been registered')) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}