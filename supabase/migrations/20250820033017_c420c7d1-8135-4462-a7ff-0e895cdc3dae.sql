-- Continue with remaining security fixes (roles system already exists)

-- Update content table policies to be admin-only
-- Boards table
DROP POLICY IF EXISTS "Allow authenticated users to insert boards" ON public.boards;
DROP POLICY IF EXISTS "Allow authenticated users to update boards" ON public.boards;
DROP POLICY IF EXISTS "Allow authenticated users to delete boards" ON public.boards;

CREATE POLICY "Only admins can insert boards" 
ON public.boards 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update boards" 
ON public.boards 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete boards" 
ON public.boards 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Components table
DROP POLICY IF EXISTS "Allow authenticated users to insert components" ON public.components;
DROP POLICY IF EXISTS "Allow authenticated users to update components" ON public.components;
DROP POLICY IF EXISTS "Allow authenticated users to delete components" ON public.components;

CREATE POLICY "Only admins can insert components" 
ON public.components 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update components" 
ON public.components 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete components" 
ON public.components 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Devices table
DROP POLICY IF EXISTS "Allow authenticated users to insert devices" ON public.devices;
DROP POLICY IF EXISTS "Allow authenticated users to update devices" ON public.devices;
DROP POLICY IF EXISTS "Allow authenticated users to delete devices" ON public.devices;

CREATE POLICY "Only admins can insert devices" 
ON public.devices 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update devices" 
ON public.devices 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete devices" 
ON public.devices 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Instruments table
DROP POLICY IF EXISTS "Allow authenticated users to insert instruments" ON public.instruments;
DROP POLICY IF EXISTS "Allow authenticated users to update instruments" ON public.instruments;
DROP POLICY IF EXISTS "Allow authenticated users to delete instruments" ON public.instruments;

CREATE POLICY "Only admins can insert instruments" 
ON public.instruments 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update instruments" 
ON public.instruments 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete instruments" 
ON public.instruments 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- PCBs table
DROP POLICY IF EXISTS "Allow authenticated users to insert PCBs" ON public.pcbs;
DROP POLICY IF EXISTS "Allow authenticated users to update PCBs" ON public.pcbs;
DROP POLICY IF EXISTS "Allow authenticated users to delete PCBs" ON public.pcbs;

CREATE POLICY "Only admins can insert PCBs" 
ON public.pcbs 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update PCBs" 
ON public.pcbs 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete PCBs" 
ON public.pcbs 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));