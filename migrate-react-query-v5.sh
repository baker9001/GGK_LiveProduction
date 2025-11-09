#!/bin/bash

# Script to migrate React Query v4 to v5
# Main change: isLoading -> isPending

# Find all TypeScript/TSX files and replace isLoading with isPending
# This is safe because React Query v5 universally renamed this property

find /tmp/cc-agent/54326970/project/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/\bisLoading\b/isPending/g' {} +

# Also replace 'loading' status with 'pending' status in status checks
find /tmp/cc-agent/54326970/project/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s/status === ['\"]loading['\"]/status === 'pending'/g" {} +
find /tmp/cc-agent/54326970/project/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s/status !== ['\"]loading['\"]/status !== 'pending'/g" {} +

echo "Migration complete: isLoading -> isPending"
echo "Migration complete: 'loading' status -> 'pending' status"
