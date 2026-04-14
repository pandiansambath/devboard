import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Admin client to add member after invite
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const workspaceId = searchParams.get('workspaceId')
  const workspaceSlug = searchParams.get('workspaceSlug')

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // If they came from an invite link → add them to that workspace
      if (workspaceId) {
        // Check if already a member
        const { data: existing } = await supabaseAdmin
          .from('workspace_members')
          .select('id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id)
          .single()

        if (!existing) {
          // Get their pending invite to know what role they should have
          const { data: invite } = await supabaseAdmin
            .from('workspace_invites')
            .select('role')
            .eq('workspace_id', workspaceId)
            .eq('email', user.email!.toLowerCase())
            .single()

          await supabaseAdmin.from('workspace_members').insert({
            workspace_id: workspaceId,
            user_id: user.id,
            role: invite?.role || 'member',
          })

          // Clean up the pending invite
          await supabaseAdmin
            .from('workspace_invites')
            .delete()
            .eq('workspace_id', workspaceId)
            .eq('email', user.email!.toLowerCase())
        }

        return NextResponse.redirect(`${origin}/workspace/${workspaceSlug}`)
      }

      // Normal signup (not from invite) → check if they have a workspace
      const { data: memberships } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      const hasWorkspace = memberships && memberships.length > 0
      return NextResponse.redirect(`${origin}${hasWorkspace ? '/dashboard' : '/onboarding'}`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}