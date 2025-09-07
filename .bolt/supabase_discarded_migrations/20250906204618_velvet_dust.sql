@@ .. @@
       l.start_date,
       l.end_date,
       l.status,
       (l.end_date < CURRENT_DATE) as is_expired,
-      EXTRACT(DAY FROM (l.end_date - CURRENT_DATE)) as days_until_expiry
+      EXTRACT(DAY FROM (l.end_date::date - CURRENT_DATE::date))::integer as days_until_expiry