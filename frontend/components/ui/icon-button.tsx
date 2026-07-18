import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface IconButtonProps extends React.ComponentPropsWithoutRef<
  typeof Button
> {
  tooltip: string;
  children: React.ReactNode;
}

/**
 * Icon-only button with a tooltip. Wraps shadcn Button + Tooltip.
 * Pass all Button props as usual; `tooltip` is the accessible label shown on hover.
 */
export function IconButton({
  tooltip,
  children,
  className,
  ...props
}: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button aria-label={tooltip} className={cn(className)} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
