-- Add UPDATE policy for courses table
CREATE POLICY "courses_update" ON courses FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
