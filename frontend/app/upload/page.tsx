'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImportList } from '@/components/upload/import-list';
import { UploadWizard } from '@/components/upload/upload-wizard';
import { fetchImports } from '@/lib/api';
import { ImportRecord } from '@/lib/types';

export default function UploadPage() {
  const [imports, setImports] = useState<ImportRecord[]>([]);
  const [wizardKey, setWizardKey] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadImports = useCallback(async () => {
    try {
      const data = await fetchImports();
      setImports(data);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    loadImports();
  }, [loadImports]);

  // Poll the import list while any import is still in progress
  useEffect(() => {
    const hasInProgress = imports.some(
      (i) => i.status === 'EN_ATTENTE' || i.status === 'EN_COURS'
    );
    if (hasInProgress && !pollingRef.current) {
      pollingRef.current = setInterval(loadImports, 3000);
    } else if (!hasInProgress && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [imports, loadImports]);

  const handleSuccess = useCallback(() => {
    loadImports();
    setWizardKey((k) => k + 1);
  }, [loadImports]);

  return (
    <DashboardLayout
      title="Import de Données"
      description="Importez vos fichiers d'inventaire en 3 étapes guidées"
    >
      <div className="grid gap-2.5 lg:grid-cols-3">
        {/* Upload Wizard */}
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Assistant d&apos;import</CardTitle>
            </CardHeader>
            <CardContent>
              <UploadWizard key={wizardKey} onSuccess={handleSuccess} />
            </CardContent>
          </Card>
        </div>

        {/* Import history */}
        <div className="lg:col-span-1">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Imports Récents</CardTitle>
                <Link
                  href="/imports"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voir tout →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <ImportList imports={imports} />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
