'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { uploadFile } from '@/lib/api'

type UploadStatus = 'idle' | 'dragging' | 'uploading' | 'success' | 'error'

interface UploadedFile {
  name: string
  size: number
  type: string
}

interface UploadResult {
  inserted?: number
  updated?: number
  skipped?: number
  total?: number
}

interface UploadDropzoneProps {
  fileType: 'products' | 'sales'
}

export function UploadDropzone({ fileType }: UploadDropzoneProps) {
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setStatus('dragging')
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setStatus('idle')
  }, [])

  const performUpload = useCallback(
    async (file: File) => {
      setUploadedFile({ name: file.name, size: file.size, type: file.type })
      setStatus('uploading')
      setProgress(0)
      setResult(null)

      const timer = setInterval(() => {
        setProgress((p) => Math.min(p + 15, 90))
      }, 300)

      try {
        const data = await uploadFile(file, fileType)
        clearInterval(timer)
        setProgress(100)
        setStatus('success')
        setResult(fileType === 'products' ? data.products : data.sales)
      } catch (err) {
        clearInterval(timer)
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    },
    [fileType],
  )

  const validateAndUpload = useCallback(
    (file: File) => {
      if (
        file.type === 'text/csv' ||
        file.name.endsWith('.csv') ||
        file.name.endsWith('.xlsx')
      ) {
        performUpload(file)
      } else {
        setStatus('error')
        setError('Format non supporte. Utilisez CSV ou XLSX.')
      }
    },
    [performUpload],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) validateAndUpload(file)
    },
    [validateAndUpload],
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) validateAndUpload(file)
    },
    [validateAndUpload],
  )

  const handleReset = useCallback(() => {
    setStatus('idle')
    setProgress(0)
    setUploadedFile(null)
    setError(null)
    setResult(null)
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all',
          status === 'idle' && 'border-border hover:border-primary/50 hover:bg-muted/30',
          status === 'dragging' && 'border-primary bg-primary/5',
          status === 'uploading' && 'border-primary/50 bg-muted/30',
          status === 'success' && 'border-risk-low bg-risk-low/5',
          status === 'error' && 'border-risk-critical bg-risk-critical/5',
        )}
      >
        {status === 'idle' && (
          <>
            <div className="mb-4 rounded-full bg-muted p-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">
              Glissez votre fichier ici
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              ou cliquez pour selectionner
            </p>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileInput}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
            <p className="text-xs text-muted-foreground">
              Formats acceptes: CSV, XLSX (max. 50MB)
            </p>
          </>
        )}

        {status === 'dragging' && (
          <>
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-primary">
              Deposez le fichier ici
            </h3>
          </>
        )}

        {status === 'uploading' && uploadedFile && (
          <div className="w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{uploadedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(uploadedFile.size)}
                </p>
              </div>
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                Traitement en cours... {progress}%
              </p>
            </div>
          </div>
        )}

        {status === 'success' && uploadedFile && (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-fit rounded-full bg-risk-low/10 p-4">
              <CheckCircle className="h-8 w-8 text-risk-low" />
            </div>
            <div>
              <h3 className="mb-1 text-lg font-medium text-risk-low">
                Import reussi
              </h3>
              <p className="text-sm text-muted-foreground">
                {uploadedFile.name} a ete traite avec succes
              </p>
              {result && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {result.inserted != null && `${result.inserted} inseres`}
                  {result.updated != null && ` · ${result.updated} mis a jour`}
                  {result.skipped != null && result.skipped > 0 && ` · ${result.skipped} ignores`}
                </p>
              )}
            </div>
            <Button onClick={handleReset} variant="outline">
              Importer un autre fichier
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-fit rounded-full bg-risk-critical/10 p-4">
              <XCircle className="h-8 w-8 text-risk-critical" />
            </div>
            <div>
              <h3 className="mb-1 text-lg font-medium text-risk-critical">
                Erreur
              </h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={handleReset} variant="outline">
              Reessayer
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
