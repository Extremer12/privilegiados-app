import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, MessageSquare, Send, X } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ServiceFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceId: string;
  serviceTitle: string;
}

export const ServiceFeedbackDialog = ({ 
  open, 
  onOpenChange, 
  serviceId, 
  serviceTitle 
}: ServiceFeedbackDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("No autenticado");
      if (rating === 0) throw new Error("Por favor selecciona una puntuación");

      const { error } = await supabase
        .from('service_feedback')
        .insert({
          service_id: serviceId,
          user_id: user.id,
          rating,
          comment
        });

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success("¡Gracias por tu valoración!");
      queryClient.invalidateQueries({ queryKey: ['service_feedback_status'] });
      queryClient.invalidateQueries({ queryKey: ['setlists'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error submitting feedback:", error);
      toast.error(error.message || "Error al enviar la valoración");
    }
  });

  const handleRating = (value: number) => setRating(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-secondary/20 card-gradient overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-secondary/10 to-transparent pointer-events-none" />
        
        <DialogHeader className="relative z-10 pt-4">
          <div className="w-16 h-16 rounded-3xl bg-secondary/10 flex items-center justify-center mx-auto mb-4 border border-secondary/20 shadow-xl shadow-secondary/5">
            <Star className="w-8 h-8 text-secondary fill-secondary/20" />
          </div>
          <DialogTitle className="text-2xl font-black text-center tracking-tight">
            Valoración del Servicio
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground font-medium px-4">
            ¿Cómo fue tu experiencia en <span className="text-foreground font-bold">{serviceTitle}</span>? Tu opinión nos ayuda a crecer.
          </DialogDescription>
        </DialogHeader>

        <div className="relative z-10 py-8 space-y-8">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => handleRating(star)}
                  className="p-1 transition-all duration-300 transform hover:scale-125 active:scale-95"
                >
                  <Star 
                    className={`w-10 h-10 transition-all duration-300 ${
                      (hoveredRating || rating) >= star 
                        ? 'text-secondary fill-secondary drop-shadow-[0_0_8px_rgba(var(--secondary-rgb),0.5)]' 
                        : 'text-muted-foreground/30 fill-transparent'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-secondary/60 h-4">
              {rating === 1 && "Pudo ser mejor"}
              {rating === 2 && "Regular"}
              {rating === 3 && "Bueno"}
              {rating === 4 && "Muy Bueno"}
              {rating === 5 && "¡Excelente / Gloria a Dios!"}
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-3 px-2">
            <div className="flex items-center gap-2 text-secondary ml-1">
              <MessageSquare className="w-4 h-4" />
              <label className="text-xs font-black uppercase tracking-widest">Opinión personal y sugerencias</label>
            </div>
            <Textarea
              placeholder="Escribe aquí tus comentarios, sugerencias o lo que Dios puso en tu corazón..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[120px] bg-muted/30 border-border/50 rounded-2xl focus:ring-secondary/20 focus:border-secondary/30 transition-all text-sm resize-none p-4"
            />
          </div>
        </div>

        <DialogFooter className="relative z-10 gap-3 pb-4">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="h-12 rounded-2xl font-bold flex-1"
          >
            Ahora no
          </Button>
          <Button 
            onClick={() => submitMutation.mutate()} 
            disabled={rating === 0 || submitMutation.isPending}
            className="h-12 rounded-2xl bg-secondary text-white font-black uppercase tracking-widest px-8 shadow-xl shadow-secondary/20 flex-1 gap-2"
          >
            {submitMutation.isPending ? (
              "Enviando..."
            ) : (
              <>
                Enviar <Send className="w-4 h-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
