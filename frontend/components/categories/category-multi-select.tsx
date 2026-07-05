'use client';

import { Check, ChevronsUpDown, Tag, X } from 'lucide-react';
import { useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Category } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CategoryMultiSelectProps {
  categories: Category[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CategoryMultiSelect({
  categories,
  value,
  onChange,
  disabled = false,
  placeholder = 'Sélectionner des catégories',
}: CategoryMultiSelectProps) {
  const selected = useMemo(
    () => categories.filter((c) => value.includes(c.category_id)),
    [categories, value]
  );

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <Tag className="h-4 w-4" />
              {selected.length > 0
                ? `${selected.length} catégorie${selected.length > 1 ? 's' : ''} sélectionnée${selected.length > 1 ? 's' : ''}`
                : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-1"
          align="start"
        >
          {categories.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              Aucune catégorie disponible
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {categories.map((cat) => {
                const isChecked = value.includes(cat.category_id);
                return (
                  <button
                    key={cat.category_id}
                    type="button"
                    onClick={() => toggle(cat.category_id)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded border',
                        isChecked
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input'
                      )}
                    >
                      {isChecked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex-1 text-left">{cat.name}</span>
                    {cat.is_system && (
                      <span className="text-[10px] text-muted-foreground">
                        système
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((cat) => (
            <Badge
              key={cat.category_id}
              variant="secondary"
              className="gap-1 pr-1 text-xs font-normal"
            >
              {cat.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggle(cat.category_id)}
                  className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
