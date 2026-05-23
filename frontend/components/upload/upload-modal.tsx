'use client'

import { Upload } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { UploadDropzone } from './upload-dropzone'

interface UploadModalProps {
  /** Type de fichier présélectionné à l'ouverture (défaut : products) */
  defaultFileType?: 'products' | 'sales'
  /** Noeud déclencheur personnalisé — si absent, un bouton par défaut est rendu */
  trigger?: React.ReactNode
}

export function UploadModal({ defaultFileType = 'products', trigger }: UploadModalProps) {
  const [open, setOpen] = useState(false)
  const [fileType, setFileType] = useState<'products' | 'sales'>(defaultFileType)

  // Réinitialiser le type de fichier à la fermeture
  const handleOpenChange = (next: boolean) => {
    if (!next) setFileType(defaultFileType)
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Importer
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer un fichier</DialogTitle>
        </DialogHeader>

        {/* Sélecteur de type */}
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

        {/* key={fileType} : remont le composant à chaque changement de type → reset du state */}
        <UploadDropzone key={fileType} fileType={fileType} />

        <p className="text-xs text-muted-foreground">
          {fileType === 'products'
            ? 'Colonnes : name, expiry_date, stock_quantity, unit_price. Optionnel : external_sku, category, brand, cost_price'
            : 'Colonnes : external_sku, sale_date, quantity_sold. Optionnel : unit_price_sold'}
        </p>
      </DialogContent>
    </Dialog>
  )
}
