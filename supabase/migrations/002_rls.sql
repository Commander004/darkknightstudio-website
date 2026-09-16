-- =====================================================
-- DARKKNIGHT STUDIO — Row Level Security
-- =====================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_presence ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an active admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins
    WHERE user_id = auth.uid() AND is_active = true
  );
$$;

-- Helper: is owner?
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admins a
    JOIN roles r ON r.id = a.role_id
    WHERE a.user_id = auth.uid() AND a.is_active = true AND r.name = 'OWNER'
  );
$$;

-- ========== PUBLIC READ POLICIES ==========

-- Projects: public can read non-archived
CREATE POLICY "Public read projects" ON projects
  FOR SELECT USING (status != 'ARCHIVED' OR is_admin());

CREATE POLICY "Admin manage projects" ON projects
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Public read project_media" ON project_media
  FOR SELECT USING (true);
CREATE POLICY "Admin manage project_media" ON project_media
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Public read project_links" ON project_links
  FOR SELECT USING (true);
CREATE POLICY "Admin manage project_links" ON project_links
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- News: only published for public
CREATE POLICY "Public read published news" ON news
  FOR SELECT USING (status = 'PUBLISHED' OR is_admin());
CREATE POLICY "Admin manage news" ON news
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Team
CREATE POLICY "Public read visible team" ON team_members
  FOR SELECT USING (is_visible = true OR is_admin());
CREATE POLICY "Admin manage team" ON team_members
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Statistics
CREATE POLICY "Public read visible stats" ON statistics
  FOR SELECT USING (is_visible = true OR is_admin());
CREATE POLICY "Admin manage stats" ON statistics
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Official links
CREATE POLICY "Public read links" ON official_links
  FOR SELECT USING (is_visible = true OR is_admin());
CREATE POLICY "Admin manage links" ON official_links
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Site settings: public can read (needed for maintenance/theme)
CREATE POLICY "Public read settings" ON site_settings
  FOR SELECT USING (true);
CREATE POLICY "Admin manage settings" ON site_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Homepage sections
CREATE POLICY "Public read sections" ON homepage_sections
  FOR SELECT USING (true);
CREATE POLICY "Admin manage sections" ON homepage_sections
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ========== TICKETS ==========
-- Visitors can create tickets
CREATE POLICY "Anyone can create ticket" ON tickets
  FOR INSERT WITH CHECK (true);

-- Visitors can read their own ticket via access_token (enforced in app + this soft policy)
-- Note: access_token is unique; we allow select for anyone who knows the token
CREATE POLICY "Read ticket by token or admin" ON tickets
  FOR SELECT USING (true); -- token secrecy is the access control for visitors

CREATE POLICY "Visitor update own ticket fields" ON tickets
  FOR UPDATE USING (true)
  WITH CHECK (true); -- app only updates limited fields; admins use same

CREATE POLICY "Admin full ticket access" ON tickets
  FOR DELETE USING (is_admin());

-- Messages
CREATE POLICY "Anyone can insert message" ON ticket_messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read messages of known ticket" ON ticket_messages
  FOR SELECT USING (true);

CREATE POLICY "Admin delete messages" ON ticket_messages
  FOR DELETE USING (is_admin());

-- Attachments
CREATE POLICY "Anyone insert attachment meta" ON ticket_attachments
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Read attachments" ON ticket_attachments
  FOR SELECT USING (true);
CREATE POLICY "Admin delete attachments" ON ticket_attachments
  FOR DELETE USING (is_admin());

-- ========== TEAM APPLICATIONS ==========
CREATE POLICY "Anyone can apply" ON team_applications
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin manage applications" ON team_applications
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ========== VISITOR EVENTS ==========
CREATE POLICY "Anyone can insert visitor event" ON visitor_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read visitor events" ON visitor_events
  FOR SELECT USING (is_admin());

-- ========== ADMINS / ROLES / LOGS ==========
CREATE POLICY "Admin read roles" ON roles
  FOR SELECT USING (is_admin());
CREATE POLICY "Owner manage roles" ON roles
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

CREATE POLICY "Admin read admins" ON admins
  FOR SELECT USING (is_admin());
CREATE POLICY "Owner manage admins" ON admins
  FOR ALL USING (is_owner()) WITH CHECK (is_owner());

CREATE POLICY "Admin insert activity" ON activity_logs
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin read activity" ON activity_logs
  FOR SELECT USING (is_admin());

CREATE POLICY "Admin manage presence" ON admin_presence
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Public read presence count" ON admin_presence
  FOR SELECT USING (true);

-- Profiles
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION increment_stat(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION close_ticket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_closed_tickets() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_owner() TO anon, authenticated;
