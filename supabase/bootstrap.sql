-- ═══════════════════════════════════════════════════════════════════════════
-- TIH Bootstrap — run AFTER schema.sql
-- Adds policies required for self-service org creation and fixes read access
-- ═══════════════════════════════════════════════════════════════════════════

-- Allow authenticated users to create their own organization (needed for first signup)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'authenticated_create_org'
  ) THEN
    CREATE POLICY "authenticated_create_org" ON organizations
    FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- Allow users to read their own org
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'read_own_org'
  ) THEN
    CREATE POLICY "read_own_org" ON organizations
    FOR SELECT USING (id = current_org_id());
  END IF;
END $$;

-- Allow users to update their own org settings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'update_own_org'
  ) THEN
    CREATE POLICY "update_own_org" ON organizations
    FOR UPDATE USING (id = current_org_id());
  END IF;
END $$;

-- ─── OPTIONAL: Seed a default demo org ────────────────────────────────────────
-- Uncomment if you want a shared demo organization:
-- INSERT INTO organizations (id, name, slug, plan)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Org', 'demo', 'pro')
-- ON CONFLICT DO NOTHING;
