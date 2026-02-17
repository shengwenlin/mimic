-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title             TEXT NOT NULL,
  description       TEXT DEFAULT '',
  character_context TEXT DEFAULT '',
  owner_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_system         BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the default system course (Alex's Journey)
INSERT INTO courses (id, title, description, is_system)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Alex''s Journey',
  'A product designer''s first month at a new company',
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- Add course_id to scenes (nullable first, so existing rows don't break)
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

-- Assign all existing scenes to the system course
UPDATE scenes SET course_id = '00000000-0000-0000-0000-000000000001' WHERE course_id IS NULL;

-- RLS: courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_select" ON courses FOR SELECT
  USING (is_system = TRUE OR owner_id = auth.uid());

CREATE POLICY "courses_insert" ON courses FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "courses_delete" ON courses FOR DELETE
  USING (owner_id = auth.uid());

-- RLS: scenes — replace the old blanket-public policy
DROP POLICY IF EXISTS "Public scenes are viewable by all" ON scenes;
DROP POLICY IF EXISTS "scenes_readable" ON scenes;

CREATE POLICY "scenes_select" ON scenes FOR SELECT
  USING (
    course_id IS NULL OR
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = scenes.course_id
        AND (courses.is_system = TRUE OR courses.owner_id = auth.uid())
    )
  );

CREATE POLICY "scenes_insert" ON scenes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_id
        AND courses.owner_id = auth.uid()
    )
  );
