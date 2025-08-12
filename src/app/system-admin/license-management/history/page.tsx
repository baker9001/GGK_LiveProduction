import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LicenseHistoryDisplay } from '../LicenseHistoryDisplay';
import { Button } from '../../../../components/shared/Button';

export default function LicenseHistoryPage() {
  const { licenseId } = useParams();
  const navigate = useNavigate();

  if (!licenseId) {
    return <div>License ID not found</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/app/system-admin/license-management')}
            className="hover:bg-gray-100"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Licenses
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">License History</h1>
        </div>
      </div>

      <LicenseHistoryDisplay licenseId={licenseId} />
    </div>
  );
}