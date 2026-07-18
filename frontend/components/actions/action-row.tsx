'use client';

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  EyeOff,
  Heart,
  ShoppingBag,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DormantAction } from '@/lib/types';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<DormantAction['type'], string> = {
  DON: 'Don associatif',
  B2C: 'Vente B2C',
};

const TYPE_COLORS: Record<DormantAction['type'], string> = {
  DON: 'bg-red-50 text-red-700 border-red-200',
  B2C: 'bg-amber-50 text-amber-700 border-amber-200',
};

interface ActionRowProps {
  action: DormantAction;
  onValidate: (id: string, type: DormantAction['type']) => void;
  onIgnore: (id: string) => void;
  onSnooze: (id: string) => void;
  loading: boolean;
}

function ValidateButtons({
  action,
  onValidate,
  loading,
}: Pick<ActionRowProps, 'action' | 'onValidate' | 'loading'>) {
  const suggested = action.type;
  const alternative: DormantAction['type'] =
    suggested === 'DON' ? 'B2C' : 'DON';
  const SuggestedIcon = suggested === 'DON' ? Heart : ShoppingBag;
  const AltIcon = alternative === 'DON' ? Heart : ShoppingBag;

  if (suggested === 'DON') {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          size="sm"
          variant="default"
          disabled={loading}
          onClick={() => onValidate(action.id, 'DON')}
        >
          <SuggestedIcon className="h-3.5 w-3.5 mr-1" />
          Don associatif
        </Button>
        <button
          disabled={loading}
          onClick={() => onValidate(action.id, 'B2C')}
          className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50"
        >
          <AltIcon className="h-3 w-3 inline mr-0.5" />
          Vente B2C à la place
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="default"
        disabled={loading}
        onClick={() => onValidate(action.id, 'B2C')}
      >
        <SuggestedIcon className="h-3.5 w-3.5 mr-1" />
        Vente B2C
      </Button>
      <button
        disabled={loading}
        onClick={() => onValidate(action.id, 'DON')}
        className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50"
      >
        <AltIcon className="h-3 w-3 inline mr-0.5" />
        Don associatif à la place
      </button>
    </div>
  );
}

export function ActionRow({
  action,
  onValidate,
  onIgnore,
  onSnooze,
  loading,
}: ActionRowProps) {
  const isSnoozedActive =
    action.status === 'SNOOZEE' &&
    action.snoozeUntil &&
    new Date(action.snoozeUntil) > new Date();

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border/60 bg-card p-4">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">
            {action.productName}
          </span>
          <Badge
            className={cn(
              'border text-[10px] font-medium px-1.5 py-0',
              TYPE_COLORS[action.type]
            )}
            variant="outline"
          >
            {TYPE_LABELS[action.type]}
          </Badge>
          {isSnoozedActive && (
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-700 text-[10px]"
            >
              <Clock className="h-3 w-3 mr-0.5" />
              Snoozé
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>SKU {action.sku}</span>
          {action.category && <span>{action.category}</span>}
          <span>{action.stock} unités</span>
          <span>
            {action.daysOfCover > 9999
              ? '∞ j. de couverture'
              : `${Math.round(action.daysOfCover)} j. de couverture`}
          </span>
        </div>
      </div>

      {action.capitalLocked != null && (
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-sm font-semibold text-foreground">
            {action.capitalLocked.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            })}
          </span>
          <span className="text-[10px] text-muted-foreground">immobilisé</span>
        </div>
      )}

      <div className="flex items-center gap-2 flex-shrink-0">
        <ValidateButtons
          action={action}
          onValidate={onValidate}
          loading={loading}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => onSnooze(action.id)}
          title="Reporter de 48 h"
        >
          <Clock className="h-3.5 w-3.5 mr-1" />
          Snooze 48h
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={loading}
          onClick={() => onIgnore(action.id)}
          title="Ignorer ce produit"
          className="text-muted-foreground"
        >
          <EyeOff className="h-3.5 w-3.5 mr-1" />
          Ignorer
        </Button>
      </div>
    </div>
  );
}

export function EmptyActions({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
      <p className="text-sm font-medium">
        {filtered ? 'Aucun résultat pour ce filtre' : 'Votre stock est sain'}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {filtered
          ? 'Essayez un autre niveau de risque.'
          : 'Aucun produit dormant à traiter pour le moment.'}
      </p>
    </div>
  );
}

export function RoiSummary({ actions }: { actions: DormantAction[] }) {
  const totalCapital = actions.reduce(
    (sum, a) => sum + (a.capitalLocked ?? 0),
    0
  );

  if (totalCapital === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
      <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
      <span className="text-amber-800">
        <strong>
          {totalCapital.toLocaleString('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
          })}
        </strong>{' '}
        de capital immobilisé sur <strong>{actions.length}</strong> produit
        {actions.length > 1 ? 's' : ''} dormant{actions.length > 1 ? 's' : ''}
      </span>
    </div>
  );
}
