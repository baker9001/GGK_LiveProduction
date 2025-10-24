@@ .. @@
     l.total_quantity,
     l.used_quantity,
     (l.total_quantity - l.used_quantity) as available_quantity,
-    EXTRACT(DAY, l.end_date - CURRENT_DATE) as days_until_expiry,
+    EXTRACT(DAY FROM (l.end_date - CURRENT_DATE)) as days_until_expiry,
     l.start_date,
     l.end_date,