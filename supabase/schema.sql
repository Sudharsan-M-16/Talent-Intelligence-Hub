-- ═══════════════════════════════════════════════════════════════════════════
-- Talent Intelligence Hub — Complete PostgreSQL Schema
-- Run in Supabase SQL Editor: Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ─── ORGANIZATIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  plan            TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  settings        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','recruiter','viewer')),
  avatar_url      TEXT,
  preferences     JSONB NOT NULL DEFAULT '{}',
  last_seen_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TAGS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT '#6366f1',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, name)
);

-- ─── TALENT PROFILES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS talent_profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by            UUID REFERENCES user_profiles(id),

  -- Identity
  full_name             TEXT NOT NULL,
  email                 TEXT,
  phone                 TEXT,
  location              TEXT,
  linkedin_url          TEXT,
  portfolio_url         TEXT,
  website_url           TEXT,
  avatar_url            TEXT,

  -- Professional
  talent_type           TEXT NOT NULL DEFAULT 'Other'
                          CHECK (talent_type IN ('Trainer','Consultant','Employee','Speaker','Mentor','Freelancer','Contractor','Other')),
  designation           TEXT,
  organization          TEXT,
  years_experience      INT,
  availability          TEXT CHECK (availability IN ('Immediate','1 Week','2 Weeks','1 Month','3 Months','Not Available')),
  expected_compensation NUMERIC(12, 2),
  currency              TEXT NOT NULL DEFAULT 'INR',

  -- Source
  source                TEXT NOT NULL DEFAULT 'Manual'
                          CHECK (source IN ('WhatsApp','LinkedIn','Referral','Email','Website','Job Portal','Manual','Other')),
  source_detail         TEXT,
  referral_name         TEXT,

  -- Pipeline
  status                TEXT NOT NULL DEFAULT 'New'
                          CHECK (status IN ('New','Under Review','Shortlisted','Approved','Engaged','Rejected')),
  priority              TEXT NOT NULL DEFAULT 'Normal'
                          CHECK (priority IN ('Low','Normal','High','Urgent')),

  -- Skills (denormalized arrays for fast filtering)
  primary_skills        TEXT[] NOT NULL DEFAULT '{}',
  secondary_skills      TEXT[] NOT NULL DEFAULT '{}',
  certifications        TEXT[] NOT NULL DEFAULT '{}',
  industry_domains      TEXT[] NOT NULL DEFAULT '{}',
  languages             TEXT[] NOT NULL DEFAULT '{}',

  -- Evaluation summary (computed by trigger)
  overall_rating        NUMERIC(3, 2),
  evaluation_count      INT NOT NULL DEFAULT 0,

  -- Recruiter notes
  notes                 TEXT,
  recruiter_notes       TEXT,

  -- Flags
  is_shortlisted        BOOLEAN NOT NULL DEFAULT FALSE,
  is_favorite           BOOLEAN NOT NULL DEFAULT FALSE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,

  -- Full-text search
  search_vector         TSVECTOR,

  -- Custom fields (extensible without schema changes)
  custom_fields         JSONB NOT NULL DEFAULT '{}',

  -- Audit
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent exact duplicate emails within org
  UNIQUE (org_id, email)
);

-- ─── TALENT TAGS (junction) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS talent_tags (
  talent_id   UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (talent_id, tag_id)
);

-- ─── DOCUMENTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  talent_id     UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  file_type     TEXT,       -- 'resume', 'portfolio', 'certificate', 'other'
  file_size     INT,
  mime_type     TEXT,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  parsed_text   TEXT,       -- extracted resume text
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EVALUATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evaluations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  talent_id       UUID NOT NULL REFERENCES talent_profiles(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  evaluator_id    UUID REFERENCES user_profiles(id),

  -- Scores (1-5)
  technical_score       NUMERIC(3,2) CHECK (technical_score BETWEEN 1 AND 5),
  communication_score   NUMERIC(3,2) CHECK (communication_score BETWEEN 1 AND 5),
  culture_fit_score     NUMERIC(3,2) CHECK (culture_fit_score BETWEEN 1 AND 5),
  leadership_score      NUMERIC(3,2) CHECK (leadership_score BETWEEN 1 AND 5),
  domain_score          NUMERIC(3,2) CHECK (domain_score BETWEEN 1 AND 5),
  overall_score         NUMERIC(3,2) CHECK (overall_score BETWEEN 1 AND 5),

  -- Extra custom metrics stored as JSON: { "metric_name": score }
  custom_scores         JSONB NOT NULL DEFAULT '{}',

  recommendation        TEXT CHECK (recommendation IN ('Strong Yes','Yes','Maybe','No','Strong No')),
  comments              TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ACTIVITY LOG ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  talent_id     UUID REFERENCES talent_profiles(id) ON DELETE SET NULL,
  actor_id      UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,   -- 'STATUS_CHANGED', 'PROFILE_CREATED', etc.
  description   TEXT,
  meta          JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SAVED SEARCHES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_searches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  filters     JSONB NOT NULL DEFAULT '{}',
  is_shared   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── WEBHOOKS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  url             TEXT NOT NULL,
  secret          TEXT,
  events          TEXT[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_triggered  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_talent_org ON talent_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_talent_status ON talent_profiles(org_id, status);
CREATE INDEX IF NOT EXISTS idx_talent_type ON talent_profiles(org_id, talent_type);
CREATE INDEX IF NOT EXISTS idx_talent_source ON talent_profiles(org_id, source);
CREATE INDEX IF NOT EXISTS idx_talent_rating ON talent_profiles(org_id, overall_rating DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_talent_created ON talent_profiles(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_talent_shortlisted ON talent_profiles(org_id, is_shortlisted) WHERE is_shortlisted = TRUE;
CREATE INDEX IF NOT EXISTS idx_talent_favorite ON talent_profiles(org_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_talent_skills ON talent_profiles USING GIN(primary_skills);
CREATE INDEX IF NOT EXISTS idx_talent_search ON talent_profiles USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_talent_trgm ON talent_profiles USING GIN(full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_evaluations_talent ON evaluations(talent_id);
CREATE INDEX IF NOT EXISTS idx_activity_talent ON activity_log(talent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_org ON activity_log(org_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_talent_updated_at BEFORE UPDATE ON talent_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_evaluation_updated_at BEFORE UPDATE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Update search_vector when profile changes
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.full_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.designation, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.organization, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(NEW.primary_skills, ' ')), 'A') ||
    setweight(to_tsvector('english', array_to_string(NEW.secondary_skills, ' ')), 'B') ||
    setweight(to_tsvector('english', array_to_string(NEW.certifications, ' ')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_talent_search_vector BEFORE INSERT OR UPDATE ON talent_profiles
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Recompute overall_rating after evaluation insert/update/delete
CREATE OR REPLACE FUNCTION recompute_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_avg   NUMERIC;
  v_count INT;
  v_id    UUID;
BEGIN
  v_id := COALESCE(NEW.talent_id, OLD.talent_id);
  SELECT AVG(overall_score), COUNT(*) INTO v_avg, v_count
  FROM evaluations WHERE talent_id = v_id;
  UPDATE talent_profiles
  SET overall_rating = ROUND(v_avg::NUMERIC, 2), evaluation_count = v_count
  WHERE id = v_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recompute_rating
AFTER INSERT OR UPDATE OR DELETE ON evaluations
  FOR EACH ROW EXECUTE FUNCTION recompute_rating();

-- Auto-log activity on status change
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activity_log(org_id, talent_id, action, description, meta)
    VALUES (
      NEW.org_id,
      NEW.id,
      'STATUS_CHANGED',
      format('%s status changed from %s to %s', NEW.full_name, OLD.status, NEW.status),
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_status_change AFTER UPDATE ON talent_profiles
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- Log profile creation
CREATE OR REPLACE FUNCTION log_profile_created()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO activity_log(org_id, talent_id, action, description, meta)
  VALUES (
    NEW.org_id, NEW.id, 'PROFILE_CREATED',
    format('New profile added for %s via %s', NEW.full_name, NEW.source),
    jsonb_build_object('source', NEW.source, 'type', NEW.talent_type)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_profile_created AFTER INSERT ON talent_profiles
  FOR EACH ROW EXECUTE FUNCTION log_profile_created();

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's org_id
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT org_id FROM user_profiles WHERE id = auth.uid()
$$;

-- Org-scoped policies
CREATE POLICY "org_talent" ON talent_profiles FOR ALL USING (org_id = current_org_id());
CREATE POLICY "org_evaluations" ON evaluations FOR ALL USING (org_id = current_org_id());
CREATE POLICY "org_activity" ON activity_log FOR ALL USING (org_id = current_org_id());
CREATE POLICY "org_tags" ON tags FOR ALL USING (org_id = current_org_id());
CREATE POLICY "org_documents" ON documents FOR ALL USING (org_id = current_org_id());
CREATE POLICY "org_saved_searches" ON saved_searches FOR ALL USING (org_id = current_org_id());
CREATE POLICY "user_own_profile" ON user_profiles FOR ALL USING (id = auth.uid() OR org_id = current_org_id());

-- ═══════════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ═══════════════════════════════════════════════════════════════════════════
-- Run these in Supabase Dashboard → Storage → Create bucket

-- INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW talent_with_stats AS
SELECT
  t.*,
  COALESCE(array_agg(DISTINCT tg.name) FILTER (WHERE tg.name IS NOT NULL), '{}') AS tag_names,
  COALESCE(array_agg(DISTINCT tg.color) FILTER (WHERE tg.color IS NOT NULL), '{}') AS tag_colors
FROM talent_profiles t
LEFT JOIN talent_tags tt ON tt.talent_id = t.id
LEFT JOIN tags tg ON tg.id = tt.tag_id
GROUP BY t.id;

-- Pipeline summary per org
CREATE OR REPLACE VIEW pipeline_summary AS
SELECT
  org_id,
  COUNT(*) FILTER (WHERE status = 'New')           AS new_count,
  COUNT(*) FILTER (WHERE status = 'Under Review')  AS under_review_count,
  COUNT(*) FILTER (WHERE status = 'Shortlisted')   AS shortlisted_count,
  COUNT(*) FILTER (WHERE status = 'Approved')      AS approved_count,
  COUNT(*) FILTER (WHERE status = 'Engaged')       AS engaged_count,
  COUNT(*) FILTER (WHERE status = 'Rejected')      AS rejected_count,
  COUNT(*) FILTER (WHERE is_active)                AS total_active
FROM talent_profiles
GROUP BY org_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- FULL TEXT SEARCH FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION search_talent(
  p_org_id  UUID,
  p_query   TEXT,
  p_limit   INT DEFAULT 20,
  p_offset  INT DEFAULT 0
)
RETURNS TABLE (
  id UUID, full_name TEXT, designation TEXT, status TEXT,
  talent_type TEXT, primary_skills TEXT[], overall_rating NUMERIC,
  location TEXT, rank REAL
) LANGUAGE sql STABLE AS $$
  SELECT
    id, full_name, designation, status, talent_type,
    primary_skills, overall_rating, location,
    ts_rank(search_vector, websearch_to_tsquery('english', p_query)) AS rank
  FROM talent_profiles
  WHERE
    org_id = p_org_id AND is_active = TRUE AND
    (
      search_vector @@ websearch_to_tsquery('english', p_query)
      OR full_name ILIKE '%' || p_query || '%'
      OR email ILIKE '%' || p_query || '%'
      OR p_query = ANY(primary_skills)
    )
  ORDER BY rank DESC, overall_rating DESC NULLS LAST
  LIMIT p_limit OFFSET p_offset;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED: Demo Organization + Admin User (optional, for local dev)
-- Comment out if not needed
-- ═══════════════════════════════════════════════════════════════════════════

/*
INSERT INTO organizations (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Org', 'demo', 'pro')
ON CONFLICT DO NOTHING;
*/
