'use client';

import { CheckCircle2, Clock, FileText } from 'lucide-react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadWizard } from '@/components/upload/upload-wizard';

const recentUploads = [
  {
    id: '1',
    name: 'inventaire_mars_2026.csv',
    date: '2026-03-28T14:30:00',
    records: 1250,
  },
  {
    id: '2',
    name: 'stock_update_26.csv',
    date: '2026-03-25T09:15:00',
    records: 450,
  },
  {
    id: '3',
    name: 'produits_frais.xlsx',
    date: '2026-03-20T16:45:00',
    records: 320,
  },
];

export default function UploadPage() {
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

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
              <UploadWizard />
            </CardContent>
          </Card>
        </div>

        {/* Recent Uploads */}
        <div className="lg:col-span-1">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Imports Récents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-start gap-3 rounded-lg border border-border/50 p-3"
                >
                  <div className="rounded-lg bg-muted p-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{upload.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(upload.date)}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-risk-low">
                      <CheckCircle2 className="h-3 w-3" />
                      {upload.records} enregistrements
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
