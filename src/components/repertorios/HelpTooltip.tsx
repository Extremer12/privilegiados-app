import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface HelpTooltipProps {
  title: string;
  description: string;
  example?: string;
}

export function HelpTooltip({ title, description, example }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="ml-2 text-muted-foreground hover:text-primary transition-colors"
        aria-label={`Ayuda sobre ${title}`}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              {description}
            </DialogDescription>
          </DialogHeader>
          
          {example && (
            <div className="bg-secondary/50 rounded-lg p-4 mt-2">
              <p className="text-sm text-muted-foreground font-medium mb-2">Ejemplo:</p>
              <p className="text-sm italic">{example}</p>
            </div>
          )}
          
          <Button variant="outline" onClick={() => setOpen(false)} className="mt-2">
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
