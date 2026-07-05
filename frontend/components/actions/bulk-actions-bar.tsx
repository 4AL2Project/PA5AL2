'use client';

import { Clock, EyeOff, Loader2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface BulkActionsBarProps {
  count: number;
  onSnooze: () => void;
  onIgnore: () => void;
  onClear: () => void;
  loading: boolean;
}

export function BulkActionsBar({
  count,
  onSnooze,
  onIgnore,
  onClear,
  loading,
}: BulkActionsBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm">
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        <span className="font-medium">
          {count} produit{count > 1 ? 's' : ''} sélectionné
          {count > 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={onClear}
          disabled={loading}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50"
        >
          Tout désélectionner
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={onSnooze}
        >
          <Clock className="h-3.5 w-3.5 mr-1" />
          Reporter 48 h
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={onIgnore}
          className="text-muted-foreground"
        >
          <EyeOff className="h-3.5 w-3.5 mr-1" />
          Ignorer
        </Button>
        <Button
          size="icon"
          variant="ghost"
          disabled={loading}
          onClick={onClear}
          aria-label="Fermer la sélection"
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
