-- Update RLS policies to allow public access since authentication is disabled

-- Update devices table policies
DROP POLICY IF EXISTS "Allow authenticated users to view devices" ON devices;
DROP POLICY IF EXISTS "Only admins can insert devices" ON devices;
DROP POLICY IF EXISTS "Only admins can update devices" ON devices;
DROP POLICY IF EXISTS "Only admins can delete devices" ON devices;

CREATE POLICY "Allow public read access to devices" ON devices FOR SELECT USING (true);

-- Update instruments table policies  
DROP POLICY IF EXISTS "Allow authenticated users to view instruments" ON instruments;
DROP POLICY IF EXISTS "Only admins can insert instruments" ON instruments;
DROP POLICY IF EXISTS "Only admins can update instruments" ON instruments;
DROP POLICY IF EXISTS "Only admins can delete instruments" ON instruments;

CREATE POLICY "Allow public read access to instruments" ON instruments FOR SELECT USING (true);

-- Update components table policies
DROP POLICY IF EXISTS "Allow authenticated users to view components" ON components;
DROP POLICY IF EXISTS "Only admins can insert components" ON components;
DROP POLICY IF EXISTS "Only admins can update components" ON components;
DROP POLICY IF EXISTS "Only admins can delete components" ON components;

CREATE POLICY "Allow public read access to components" ON components FOR SELECT USING (true);

-- Update pcbs table policies
DROP POLICY IF EXISTS "Allow authenticated users to view PCBs" ON pcbs;
DROP POLICY IF EXISTS "Only admins can insert PCBs" ON pcbs;
DROP POLICY IF EXISTS "Only admins can update PCBs" ON pcbs;
DROP POLICY IF EXISTS "Only admins can delete PCBs" ON pcbs;

CREATE POLICY "Allow public read access to pcbs" ON pcbs FOR SELECT USING (true);

-- Update boards table policies
DROP POLICY IF EXISTS "Allow authenticated users to view boards" ON boards;
DROP POLICY IF EXISTS "Only admins can insert boards" ON boards;
DROP POLICY IF EXISTS "Only admins can update boards" ON boards;
DROP POLICY IF EXISTS "Only admins can delete boards" ON boards;

CREATE POLICY "Allow public read access to boards" ON boards FOR SELECT USING (true);

-- Update diagnostic_sessions policies to work without authentication
DROP POLICY IF EXISTS "Users can view their own diagnostic sessions" ON diagnostic_sessions;
DROP POLICY IF EXISTS "Users can create their own diagnostic sessions" ON diagnostic_sessions;
DROP POLICY IF EXISTS "Users can update their own diagnostic sessions" ON diagnostic_sessions;
DROP POLICY IF EXISTS "Users can delete their own diagnostic sessions" ON diagnostic_sessions;

CREATE POLICY "Allow public access to diagnostic sessions" ON diagnostic_sessions FOR ALL USING (true) WITH CHECK (true);