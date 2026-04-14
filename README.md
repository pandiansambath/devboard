# DevBoard

> Real-time team project management. Built with Next.js + Supabase.

**Live →** [devboardapp.vercel.app](https://devboardapp.vercel.app)

---

## What it does

DevBoard is a full-stack Kanban-style project tracker where teams can collaborate in real time. Create a workspace, invite your team, spin up projects, and manage tasks — all with live updates pushed to every member the moment something changes.

---

## Features

- **Authentication** — Email/password signup with confirmation flow. Sessions via JWT, managed entirely by Supabase Auth.
- **Workspaces** — Create team spaces. Each workspace has its own projects, members, and activity feed.
- **Role-based access** — Admins, members, and viewers each get different permissions, enforced at the database level via RLS policies.
- **Smart invites** — Search existing DevBoard users and add them instantly, or send an invite email to anyone new. Powered by Resend.
- **Kanban board** — Drag-and-drop tasks across To Do / In Progress / Done columns using native HTML5 drag API.
- **Task detail panel** — Click any task to open a side panel with status controls and a threaded comment section.
- **Real-time activity feed** — Every action (task created, moved, commented) is logged and streamed live to all connected members via Supabase Realtime.
- **Custom cursor** — Smooth spring-physics cursor animation on the Kanban board.

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Real-time | Supabase Realtime |
| File storage | Supabase Storage |
| Email | Resend |
| Hosting | Vercel |

---

## Database schema

```
profiles          ← one per user, synced from auth.users on signup
workspaces        ← teams / organisations
workspace_members ← who belongs to which workspace + their role
projects          ← live inside a workspace
tasks             ← live inside a project, have status + position
comments          ← threaded on tasks
attachments       ← files linked to tasks
activity_log      ← append-only event log, streamed in real time
notifications     ← in-app notifications per user
workspace_invites ← pending invites for users who haven't signed up yet
```

---

## How RLS works here

Every table has Row Level Security enabled. Supabase injects the logged-in user's ID into every query via the JWT, so policies like this work directly inside Postgres:

```sql
-- Users can only see tasks they created
create policy "users manage own tasks" on tasks
for all using (auth.uid() = created_by);

-- Members can see all other members of their workspace
create policy "members can read workspace members" on workspace_members
for select using (
  workspace_id in (
    select workspace_id from workspace_members where user_id = auth.uid()
  )
);
```

No application-layer filtering needed. The database enforces it.

---

## Invite flow

**Existing user** → Admin searches by name/email → selects from dropdown → user is added to `workspace_members` + gets a notification email via Resend.

**New user** → Admin enters email → stored in `workspace_invites` → invite email sent → user clicks link → signs up → `/auth/callback` detects the `workspaceId` param → auto-joins the workspace → redirected straight to it.

---

## Local setup

```bash
# 1. Clone
git clone https://github.com/pandiansambath/devboard.git
cd devboard

# 2. Install
npm install

# 3. Environment variables
# Create .env.local with:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 4. Run
npm run dev
```

Open [localhost:3000](http://localhost:3000).

---

## Deployment

Hosted on Vercel. Every push to `main` triggers an automatic production deploy.

```bash
git add .
git commit -m "your message"
git push
# → Vercel picks it up and deploys in ~2 minutes
```

---

## Roles

| Permission | Admin | Member | Viewer |
|---|:---:|:---:|:---:|
| Create projects | ✓ | ✓ | — |
| Add / move tasks | ✓ | ✓ | — |
| Comment | ✓ | ✓ | — |
| Invite members | ✓ | — | — |
| Change roles | ✓ | — | — |
| Remove members | ✓ | — | — |

---

## Project structure

```
app/
  page.tsx                          ← landing page
  login/page.tsx                    ← sign in
  signup/page.tsx                   ← sign up + email confirmation screen
  onboarding/page.tsx               ← create first workspace
  dashboard/page.tsx                ← workspace list
  workspace/[slug]/page.tsx         ← projects + members + invite
  workspace/[slug]/project/[id]/    ← kanban board + activity feed
  auth/callback/route.ts            ← handles email confirmation + invite joins
  api/invite/route.ts               ← invite API (search users, send emails)
lib/
  supabase.ts                       ← Supabase browser client
```

---

## What's next

- File attachments via Supabase Storage
- Notification bell in navbar
- Google OAuth
- Task due dates and priority indicators
- Firebase rebuild of the same app for comparison

---

Built by [pandiansambath](https://github.com/pandiansambath) · Powered by [Supabase](https://supabase.com) · Deployed on [Vercel](https://vercel.com)