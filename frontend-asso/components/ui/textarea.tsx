import * as React from 'react';

import { cn } from '@/lib/utils';

export function Textarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'border-input placeholder:text-neutral-400 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex min-h-16 w-full rounded-lg border bg-neutral-50 px-2.5 py-2 text-[13px] shadow-[0_1px_2px_0_rgb(0_0_0/0.03)] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}
