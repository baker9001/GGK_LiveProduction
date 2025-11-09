import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LicenseHistoryDisplay } from '../LicenseHistoryDisplay';
import { Button } from '../../../../components/shared/Button';
import ModulePageShell from '../../../../components/layout/ModulePageShell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/shared/Card';

export default function LicenseHistoryPage() {
  const { licenseId } = useParams();
  const navigate = useNavigate();

  if (!licenseId) {
    return (
      <ModulePageShell title="License History" subtitle="Review chronological updates for a specific license.">
        <Card variant="outlined" className="bg-card/95 backdrop-blur-sm">
          <CardContent className="text-theme-muted">
            License ID not found
          </CardContent>
        </Card>
      </ModulePageShell>
    );
  }

  return (
    <ModulePageShell
      title="License History"
      subtitle="Trace license renewals, extensions, and expansions with the refreshed GGK surfaces."
      actions={(
        <Button
          variant="secondary"
          onClick={() => navigate('/app/system-admin/license-management')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to Licenses
        </Button>
      )}
    >
      <Card variant="outlined" className="bg-card/95 backdrop-blur-sm">
        <CardHeader accent>
          <CardTitle>Activity Timeline</CardTitle>
          <CardDescription>All recorded actions for license {licenseId}.</CardDescription>
        </CardHeader>
        <CardContent>
          <LicenseHistoryDisplay licenseId={licenseId} />
        </CardContent>
      </Card>
    </ModulePageShell>
  );
}