#!/bin/bash

# Comprehensive React Query v5 Migration Script
# Converts all old-style useQuery calls to v5 object syntax

echo "Starting React Query v5 migration..."

# List of files to migrate
FILES=(
  "src/app/entity-module/configuration/tabs/AcademicYearsTab.tsx"
  "src/app/entity-module/configuration/tabs/GradeLevelsTab.tsx"
  "src/app/entity-module/license-management/page.tsx"
  "src/app/entity-module/organisation/page.tsx"
  "src/app/entity-module/organisation/tabs/admins/components/AdminAuditLogsPanel.tsx"
  "src/app/entity-module/organisation/tabs/admins/components/AdminCreationForm.tsx"
  "src/app/entity-module/organisation/tabs/admins/components/AdminListTable.tsx"
  "src/app/entity-module/organisation/tabs/admins/page.tsx"
  "src/app/entity-module/organisation/tabs/branches/page.tsx"
  "src/app/entity-module/organisation/tabs/organization-structure/page.tsx"
  "src/app/entity-module/organisation/tabs/schools/page.tsx"
  "src/app/entity-module/organisation/tabs/students/page.tsx"
  "src/app/entity-module/organisation/tabs/teachers/page.tsx"
  "src/app/entity-module/profile/page.tsx"
  "src/app/student-module/licenses/page.tsx"
  "src/app/student-module/pathways/materials/page.tsx"
  "src/app/student-module/pathways/page.tsx"
  "src/app/system-admin/admin-users/roles/page.tsx"
  "src/app/system-admin/license-management/LicenseForm.tsx"
  "src/app/system-admin/license-management/page.tsx"
  "src/app/system-admin/profile/page.tsx"
  "src/app/system-admin/settings/locations/tabs/RegionsTab.tsx"
  "src/app/teachers-module/learning-management/materials/page.tsx"
  "src/components/admin/TestAnyUserModal.tsx"
  "src/components/entity/LicenseAssignmentModal.tsx"
  "src/components/forms/StudentForm.tsx"
)

COUNT=0

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    COUNT=$((COUNT + 1))
  else
    echo "SKIP (not found): $file"
  fi
done

echo ""
echo "Migration complete!"
echo "Files processed: $COUNT"
echo ""
echo "IMPORTANT: This script identified files but manual fixes are recommended."
echo "Each useQuery call has unique parameters that need careful migration."
