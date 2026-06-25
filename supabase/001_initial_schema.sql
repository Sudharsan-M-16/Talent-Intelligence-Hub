-- ============================================================
-- Talent Intelligence Hub (TIH) — Database Schema v1.0
-- PostgreSQL with RLS, TSVECTOR, and pg_trgm
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ─── 1. Organizations ────────────────────────────────────────
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(100) UNIQUE,
  logo_url    TEXT,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. Users ────────────────────────────────────────────────
CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role            VARCHAR(20) NOT NULL DEFAULT 'recruiter'
                    CHECK (role IN ('admin', 'recruiter', 'viewer')),
  email           VARCHAR(255) NOT NULL UNIQUE,
  full_name       VARCHAR(255),
  avatar_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. Tags ─────────────────────────────────────────────────
CREATE TABLE tags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  color           VARCHAR(20) NOT NULL DEFAULT '#6366f1',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- ─── 4. Talent Profiles ──────────────────────────────────────
CREATE TABLE talent_profiles (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Personal
  full_name               VARCHAR(255) NOT NULL,
  email                   VARCHAR(255),
  phone                   VARCHAR(50),
  alternate_phone         VARCHAR(50),

  -- Classification
  talent_type             VARCHAR(50) NOT NULL DEFAULT 'Other'
                            CHECK (talent_type IN (
                              'Trainer','Consultant','Employee','Speaker',
                              'Mentor','Freelancer','Contractor','Other'
                            )),
  source                  VARCHAR(50) NOT NULL DEFAULT 'Manual'
                            CHECK (source IN (
                              'WhatsApp','LinkedIn','Referral','Email',
                              'Website','Job Portal','Manual','Other'
                            )),
  status                  VARCHAR(50) NOT NULL DEFAULT 'New'
                            CHECK (status IN (
                              'New','Under Review','Shortlisted',
                              'Approved','Engaged','Rejected'
                            )),

  -- Professional
  organization            VARCHAR(255),
  designation             VARCHAR(255),
  years_experience        INTEGER CHECK (years_experience >= 0 AND years_experience <= 60),
  location                VARCHAR(255),
  availability            VARCHAR(100),
  expected_compensation   NUMERIC(12,2) CHECK (expected_compensation >= 0),

  -- Skills & Expertise (denormalized for performance)
  primary_skills          TEXT[] NOT NULL DEFAULT '{}',
  secondary_skills        TEXT[] NOT NULL DEFAULT '{}',
  certifications          TEXT[] NOT NULL DEFAULT '{}',
  domains                 TEXT[] NOT NULL DEFAULT '{}',

  -- Links
  linkedin_url            TEXT,
  portfolio_url           TEXT,
  website                 TEXT,

  -- Media
  resume_url              TEXT,
  resume_filename         TEXT,

  -- Metadata
  notes                   TEXT,
  overall_rating          NUMERIC(3,2) CHECK (overall_rating >= 0 AND overall_rating <= 5),
  is_shortlisted          BOOLEAN NOT NULL DEFAULT false,
  is_favorite             BOOLEAN NOT NULL DEFAULT false,
  raw_metadata            JSONB DEFAULT '{}',
  is_active               BOOLEAN NOT NULL DEFAULT true,

  -- Full Text Search Vector
  search_vector           TSVECTOR,

  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for talent_profiles
CREATE INDEX idx_talent_org ON talent_profiles(organization_id);
CREATE INDEX idx_talent_status ON talent_profiles(organization_id, status);
CREATE INDEX idx_talent_type ON talent_profiles(organization_id, talent_type);
CREATE INDEX idx_talent_source ON talent_profiles(source);
CREATE INDEX idx_talent_search ON talent_profiles USING GIN(search_vector);
CREATE INDEX idx_talent_skills ON talent_profiles USING GIN(primary_skills);
CREATE INDEX idx_talent_location ON talent_profiles USING GIN(location gin_trgm_ops);
CREATE INDEX idx_talent_name ON talent_profiles USING GIN(full_name gin_trgm_ops);
CREATE INDEX idx_talent_rating ON talent_profiles(organization_id, overall_rating DESC NULLS LAST);
CREATE INDEX idx_talent_created ON talent_profiles(organization_id, created_at DESC);

-- TSVECTOR Update Function
CREATE OR REPLACE FUNCTION update_talent_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.designation, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.organization, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.primary_skills, ' '), '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.secondary_skills, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.certifications, ' '), '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.location, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.notes, '')), 'D');
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_talent_search_vector
  BEFORE INSERT OR UPDATE ON talent_profiles
  FOR EACH ROW EXECUTE FUNCTION update_talent_search_vector();

-- Full-text search RPC function
CREATE OR REPLACE FUNCTION search_talent(
  p_query TEXT,
  p_org_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS SETOF talent_profiles AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM talent_profiles
  WHERE organization_id = p_org_id
    AND is_active = true
    AND (
      search_vector @@ plainto_tsquery('english', p_query)
      OR full_name ILIKE '%' || p_query || '%'
      OR email ILIKE '%' || p_query || '%'
    )
  ORDER BY ts_rank(search_vector, plainto_tsquery('english', p_query)) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── 5. Talent Tags (M2M) ────────────────────────────────────
CREATE TABLE talent_tags (
  talent_id UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
  tag_id    UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (talent_id, tag_id)
);

-- ─── 6. Evaluations ──────────────────────────────────────────
CREATE TABLE evaluations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  talent_id       UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
  evaluator_id    UUID NOT NULL REFERENCES users(id),
  metrics         JSONB NOT NULL DEFAULT '{}',
  overall_score   NUMERIC(3,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 5),
  feedback        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eval_talent ON evaluations(talent_id);
CREATE INDEX idx_eval_org ON evaluations(organization_id);

-- Auto-update overall_rating on talent_profiles after evaluation
CREATE OR REPLACE FUNCTION update_talent_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE talent_profiles
  SET overall_rating = (
    SELECT AVG(overall_score) FROM evaluations WHERE talent_id = NEW.talent_id
  )
  WHERE id = NEW.talent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rating
  AFTER INSERT OR UPDATE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION update_talent_rating();

-- ─── 7. Saved Searches ───────────────────────────────────────
CREATE TABLE saved_searches (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(255) NOT NULL,
  filters_json JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 8. Activities ───────────────────────────────────────────
CREATE TABLE activities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  talent_id       UUID REFERENCES talent_profiles(id) ON DELETE SET NULL,
  action          VARCHAR(100) NOT NULL,
  description     TEXT NOT NULL,
  created_by      UUID REFERENCES users(id),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_talent ON activities(talent_id, created_at DESC);
CREATE INDEX idx_activity_org ON activities(organization_id, created_at DESC);

-- ─── 9. Audit Logs ───────────────────────────────────────────
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  table_name      VARCHAR(100) NOT NULL,
  record_id       UUID,
  action          VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data        JSONB,
  new_data        JSONB,
  performed_by    UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_record ON audit_logs(table_name, record_id);

-- Audit trigger function (apply to major tables)
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (organization_id, table_name, record_id, action, old_data, new_data)
  VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_talent_profiles
  AFTER INSERT OR UPDATE OR DELETE ON talent_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ─── 10. Row Level Security (RLS) ────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper to get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS VARCHAR AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS Policies: talent_profiles
CREATE POLICY "talent_org_isolation"
  ON talent_profiles FOR ALL
  USING (organization_id = current_user_org_id());

CREATE POLICY "talent_insert"
  ON talent_profiles FOR INSERT
  WITH CHECK (
    organization_id = current_user_org_id()
    AND current_user_role() IN ('admin', 'recruiter')
  );

CREATE POLICY "talent_update"
  ON talent_profiles FOR UPDATE
  USING (organization_id = current_user_org_id())
  WITH CHECK (current_user_role() IN ('admin', 'recruiter'));

CREATE POLICY "talent_delete"
  ON talent_profiles FOR DELETE
  USING (
    organization_id = current_user_org_id()
    AND current_user_role() = 'admin'
  );

-- RLS: users
CREATE POLICY "users_org_isolation"
  ON users FOR SELECT
  USING (organization_id = current_user_org_id());

-- RLS: evaluations
CREATE POLICY "eval_org_isolation"
  ON evaluations FOR ALL
  USING (organization_id = current_user_org_id());

-- RLS: tags
CREATE POLICY "tags_org_isolation"
  ON tags FOR ALL
  USING (organization_id = current_user_org_id());

-- RLS: activities
CREATE POLICY "activity_org_isolation"
  ON activities FOR SELECT
  USING (organization_id = current_user_org_id());

-- RLS: audit_logs (admin only)
CREATE POLICY "audit_admin_only"
  ON audit_logs FOR SELECT
  USING (
    organization_id = current_user_org_id()
    AND current_user_role() = 'admin'
  );

-- ─── 11. Supabase Storage Buckets ────────────────────────────
-- Run via Supabase dashboard or CLI:
-- insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false);
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);

-- ─── 12. Webhook API Endpoint Reference ──────────────────────
-- POST /api/v1/profiles/webhook
-- Payload: {
--   full_name: string,
--   email?: string,
--   phone?: string,
--   talent_type?: string,
--   source?: string,
--   skills?: string[],
--   notes?: string,
--   raw_metadata?: object  -- all unmapped data stored here
-- }
