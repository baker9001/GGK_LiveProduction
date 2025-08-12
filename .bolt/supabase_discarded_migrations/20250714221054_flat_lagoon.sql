@@ .. @@
 -- Grant execution permissions to authenticated users
 GRANT EXECUTE ON FUNCTION public.get_data_structures_with_relations() TO authenticated;
 
--- Notify PostgREST to refresh its schema cache
+-- Force PostgREST to refresh its schema cache with multiple notifications
 NOTIFY pgrst, 'reload schema';
+SELECT pg_sleep(0.5);
+NOTIFY pgrst, 'reload schema';
+SELECT pg_sleep(0.5);
+NOTIFY pgrst, 'reload schema';