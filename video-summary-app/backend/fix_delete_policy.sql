-- POLICY FIX: Allow deletion of classes (required for Admin Dashboard)
CREATE POLICY "Classes delete by everyone" ON classes FOR DELETE USING (true);
