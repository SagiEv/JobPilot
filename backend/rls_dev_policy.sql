-- Enable RLS on all tables (just in case they aren't already enabled)
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_text ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

-- Create policies that allow ALL operations to ANYONE (Development Only!)
CREATE POLICY "Dev Allow All" ON profile FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON experience_text FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON interviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON search_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON search_sites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Dev Allow All" ON skills FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE ai_analysis_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dev Allow All" ON ai_analysis_reports FOR ALL USING (true) WITH CHECK (true);
