'use client';

import { useCallback, useState } from 'react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadWizard } from '@/components/upload/upload-wizard';

export default function UploadPage() {
  const [wizardKey, setWizardKey] = useState(0);

  const handleSuccess = useCallback(() => {
    setWizardKey((k) => k + 1);
  }, []);

  return (
    <DashboardLayout
      title="Import de Données"
      description="Importez vos fichiers d'inventaire en 3 étapes guidées"
    >
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Assistant d&apos;import</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadWizard key={wizardKey} onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
