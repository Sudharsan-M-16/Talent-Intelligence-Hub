# Supabase Setup Guide for TIH

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Choose a name (e.g. `tih-platform`), set a database password
3. Select the region closest to you
4. Wait ~2 minutes for provisioning

## 2. Run the Database Schema

1. Open **Supabase Dashboard → SQL Editor → New Query**
2. Paste the full contents of `schema.sql`
3. Click **Run** (green button)

## 3. Set Up Storage Buckets

In **Supabase Dashboard → Storage → New Bucket**:

| Bucket name | Public | File size limit | Allowed types |
|-------------|--------|-----------------|---------------|
| `resumes`   | No     | 10 MB           | PDF, DOCX     |
| `avatars`   | Yes    | 2 MB            | JPEG, PNG, WebP |

Then in **Storage → Policies**, add these policies for `resumes`:
- **Upload**: `(storage.foldername(name))[1] = auth.get_org_id()::text`
- **Select**: `(storage.foldername(name))[1] = auth.get_org_id()::text`

## 4. Configure the Frontend

Create `apps/web/.env.local`:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Get these from: **Supabase Dashboard → Settings → API**

## 5. Create First User & Organization

In Supabase SQL Editor:

```sql
-- 1. Create organization
INSERT INTO organizations (id, name, slug)
VALUES ('your-org-uuid-here', 'Your Company Name', 'your-company')
RETURNING id;

-- 2. After signing up via Supabase Auth (or use the auth.createUser() API),
--    add user profile:
INSERT INTO public.users (id, organization_id, full_name, role)
VALUES ('auth-user-uuid', 'org-uuid', 'Your Name', 'admin');
```

## 6. Update Frontend Auth

Once Supabase is connected, update `apps/web/src/store/authStore.ts`:

Replace the `login` function's mock timeout with:
```ts
import { signIn } from '../lib/supabase'

login: async (email, password) => {
  set({ isLoading: true })
  const { session, user } = await signIn(email, password)
  // fetch user profile from public.users table
  // set({ user: ..., isAuthenticated: true })
}
```

## 7. Enable Real-Time (optional)

In **Supabase Dashboard → Database → Replication**, enable real-time for:
- `talent_profiles`
- `activities`
- `evaluations`

---

## Current Status

| Feature | Status |
|---------|--------|
| Database schema | ✅ Ready (run schema.sql) |
| RLS policies | ✅ In schema.sql |
| Full-text search | ✅ Auto-trigger on upsert |
| Audit logging | ✅ Auto-trigger |
| Storage buckets | ⚠️ Manual setup needed |
| Frontend env vars | ⚠️ Create .env.local |
| Auth integration | ⚠️ Replace mock login |
| Real-time | ⚠️ Optional - enable in dashboard |
