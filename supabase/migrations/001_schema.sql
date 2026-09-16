-- =====================================================
-- DARKKNIGHT STUDIO — Initial Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== ROLES & PERMISSIONS ==========
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- OWNER, ADMIN, MODERATOR, SUPPORT
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO roles (name, permissions) VALUES
  ('OWNER', '{"all": true}'::jsonb),
  ('ADMIN', '{"projects": true, "news": true, "team": true, "tickets": true, "stats": true, "links": true, "settings": false, "admins": false}'::jsonb),
  ('MODERATOR', '{"projects": true, "news": true, "tickets": true}'::jsonb),
  ('SUPPORT', '{"tickets": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ========== ADMINS ==========
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id),
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_admins_user ON admins(user_id);
CREATE INDEX idx_admins_active ON admins(is_active);

-- ========== PROFILES (optional public profiles) ==========
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== PROJECTS ==========
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  status TEXT NOT NULL DEFAULT 'IN_DEVELOPMENT'
    CHECK (status IN ('ONLINE', 'OFFLINE', 'IN_DEVELOPMENT', 'ARCHIVED')),
  version TEXT DEFAULT '1.0.0',
  tags TEXT[] DEFAULT '{}',
  technologies TEXT[] DEFAULT '{}',
  custom_stats JSONB DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_order ON projects(display_order);

CREATE TABLE IF NOT EXISTS project_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL DEFAULT 'screenshot' CHECK (media_type IN ('screenshot', 'logo', 'banner', 'file')),
  url TEXT NOT NULL,
  storage_path TEXT,
  title TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_media_pid ON project_media(project_id);

CREATE TABLE IF NOT EXISTS project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  link_type TEXT DEFAULT 'external',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== NEWS ==========
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  author TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_status ON news(status);
CREATE INDEX idx_news_published ON news(published_at DESC);

-- ========== TEAM ==========
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  bio TEXT,
  avatar_url TEXT,
  social_links JSONB DEFAULT '{}',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== STATISTICS ==========
CREATE TABLE IF NOT EXISTS statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  value BIGINT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO statistics (key, label, value, display_order) VALUES
  ('total_views', 'بازدید کل', 0, 0),
  ('projects', 'پروژه‌ها', 0, 1),
  ('members', 'اعضای تیم', 0, 2),
  ('admins_online', 'ادمین آنلاین', 0, 3)
ON CONFLICT (key) DO NOTHING;

-- ========== OFFICIAL LINKS ==========
CREATE TABLE IF NOT EXISTS official_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT DEFAULT '🔗',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== SITE SETTINGS ==========
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_settings (key, value) VALUES
  ('maintenance_mode', 'false'::jsonb),
  ('active_theme', '"darkknight"'::jsonb),
  ('site_title', '"DARKKNIGHT STUDIO"'::jsonb),
  ('hero_description', '"ما بازی‌ها و نرم‌افزارهایی می‌سازیم که مرزهای تکنولوژی رو جابه‌جا می‌کنن."'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ========== HOMEPAGE SECTIONS ==========
CREATE TABLE IF NOT EXISTS homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT UNIQUE NOT NULL,
  title TEXT,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  config JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO homepage_sections (section_key, title, is_enabled, display_order) VALUES
  ('hero', 'هیرو', true, 0),
  ('about', 'درباره', true, 1),
  ('projects', 'پروژه‌ها', true, 2),
  ('news', 'اخبار', true, 3),
  ('stats', 'آمار', true, 4),
  ('team', 'تیم', true, 5),
  ('links', 'لینک‌ها', true, 6)
ON CONFLICT (section_key) DO NOTHING;

-- ========== TICKETS ==========
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'IN_PROGRESS', 'WAITING', 'CLOSED')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  creator_name TEXT NOT NULL,
  creator_email TEXT,
  creator_visitor_id TEXT,
  assigned_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  delete_after TIMESTAMPTZ, -- set when closed for delayed deletion
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_token ON tickets(access_token);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_delete ON tickets(delete_after) WHERE delete_after IS NOT NULL;

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'admin', 'system')),
  sender_name TEXT,
  sender_admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_messages_tid ON ticket_messages(ticket_id);

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  message_id UUID REFERENCES ticket_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INT,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== TEAM APPLICATIONS ==========
CREATE TABLE IF NOT EXISTS team_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT,
  age INT,
  skills TEXT,
  experience TEXT,
  portfolio TEXT,
  contact TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== ACTIVITY LOGS ==========
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);

-- ========== VISITOR EVENTS (view counter) ==========
CREATE TABLE IF NOT EXISTS visitor_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'page_view',
  page TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visitor_vid ON visitor_events(visitor_id, created_at DESC);
CREATE INDEX idx_visitor_created ON visitor_events(created_at DESC);

-- ========== ADMIN PRESENCE ==========
CREATE TABLE IF NOT EXISTS admin_presence (
  admin_id UUID PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_online BOOLEAN NOT NULL DEFAULT true
);

-- ========== HELPER FUNCTIONS ==========

-- Increment a statistic safely
CREATE OR REPLACE FUNCTION increment_stat(stat_key TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE statistics
  SET value = value + 1, updated_at = now()
  WHERE key = stat_key;
END;
$$;

-- Close ticket and schedule deletion after 20 seconds
CREATE OR REPLACE FUNCTION close_ticket(ticket_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tickets
  SET status = 'CLOSED',
      closed_at = now(),
      delete_after = now() + interval '20 seconds',
      updated_at = now()
  WHERE id = ticket_uuid;
END;
$$;

-- Cleanup closed tickets (call via cron or Edge Function)
CREATE OR REPLACE FUNCTION cleanup_closed_tickets()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM tickets
  WHERE delete_after IS NOT NULL
    AND delete_after <= now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_projects_updated BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_news_updated BEFORE UPDATE ON news
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_tickets_updated BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tr_admins_updated BEFORE UPDATE ON admins
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
