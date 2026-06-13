'use client';

import { Upload } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { UploadWizard } from './upload-wizard';

interface UploadModalProps {
  defaultFileType?: 'products' | 'sales';
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function UploadModal({
  defaultFileType = 'products',
  trigger,
  onSuccess,
}: UploadModalProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    onSuccess?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Importer
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Assistant d&apos;import</DialogTitle>
        </DialogHeader>

        <UploadWizard
          defaultFileType={defaultFileType}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
