@@ .. @@
 -- Create storage bucket for question attachments
 INSERT INTO storage.buckets (id, name, public)
 VALUES ('questions-attachments', 'questions-attachments', true)
 ON CONFLICT (id) DO NOTHING;
 
+-- Create storage bucket for past paper imports
+INSERT INTO storage.buckets (id, name, public)
+VALUES ('past-paper-imports', 'past-paper-imports', true)
+ON CONFLICT (id) DO NOTHING;
+
 -- Allow authenticated users to upload/delete attachments
 CREATE POLICY "Allow authenticated users to upload question attachments"
 ON storage.objects
 FOR INSERT
 TO authenticated
 WITH CHECK (bucket_id = 'questions-attachments');
 
 CREATE POLICY "Allow authenticated users to update their question attachments"
 ON storage.objects
 FOR UPDATE
 TO authenticated
 USING (bucket_id = 'questions-attachments');
 
 CREATE POLICY "Allow authenticated users to delete their question attachments"
 ON storage.objects
 FOR DELETE
 TO authenticated
 USING (bucket_id = 'questions-attachments');
 
 -- Allow public access to view question attachments
 CREATE POLICY "Allow public to view question attachments"
 ON storage.objects
 FOR SELECT
 TO public
 USING (bucket_id = 'questions-attachments');
 
+-- Allow authenticated users to upload/delete past paper imports
+CREATE POLICY "Allow authenticated users to upload past paper imports"
+ON storage.objects
+FOR INSERT
+TO authenticated
+WITH CHECK (bucket_id = 'past-paper-imports');
+
+CREATE POLICY "Allow authenticated users to update their past paper imports"
+ON storage.objects
+FOR UPDATE
+TO authenticated
+USING (bucket_id = 'past-paper-imports');
+
+CREATE POLICY "Allow authenticated users to delete their past paper imports"
+ON storage.objects
+FOR DELETE
+TO authenticated
+USING (bucket_id = 'past-paper-imports');
+
+-- Allow public access to view past paper imports
+CREATE POLICY "Allow public to view past paper imports"
+ON storage.objects
+FOR SELECT
+TO public
+USING (bucket_id = 'past-paper-imports');
+
 -- Enable Row Level Security