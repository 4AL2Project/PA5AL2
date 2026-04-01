'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { UploadDropzone } from '@/components/upload/upload-dropzone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Clock, CheckCircle2 } from 'lucide-react'

const recentUploads = [
  {
    id: '1',
    name: 'inventaire_mars_2026.csv',
    date: '2026-03-28T14:30:00',
    status: 'success',
    records: 1250,
  },
  {
    id: '2',
    name: 'stock_update_26.csv',
    date: '2026-03-25T09:15:00',
    status: 'success',
    records: 450,
  },
  {
    id: '3',
    name: 'produits_frais.xlsx',
    date: '2026-03-20T16:45:00',
    status: 'success',
    records: 320,
  },
]

export default function UploadPage() {
  const [fileType, setFileType] = useState<'products' | 'sales'>('products')

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <DashboardLayout
      title="Import de Donnees"
      description="Importez vos fichiers d'inventaire pour analyse"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Area */}
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Importer un Fichier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File type selector */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFileType('products')}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    fileType === 'products'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  Fichier produits
                </button>
                <button
                  onClick={() => setFileType('sales')}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    fileType === 'sales'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  Fichier ventes
                </button>
              </div>

              <UploadDropzone fileType={fileType} />

              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="mb-2 text-sm font-medium">Format attendu</h4>
                <p className="text-sm text-muted-foreground">
                  {fileType === 'products'
                    ? 'Colonnes requises: name, expiry_date, stock_quantity, unit_price. Optionnel: external_sku, category, brand, cost_price'
                    : 'Colonnes requises: external_sku, sale_date, quantity_sold. Optionnel: unit_price_sold'}
                </p>
                <div className="mt-3 flex gap-2">
                  <a href="#" className="text-sm text-primary hover:underline">
                    Telecharger le modele CSV
                  </a>
                  <span className="text-muted-foreground">|</span>
                  <a href="#" className="text-sm text-primary hover:underline">
                    Documentation
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Uploads */}
        <div className="lg:col-span-1">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Imports Recents
              </CardTitle>
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
  )
}
