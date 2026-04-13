import { motion, AnimatePresence } from "framer-motion";
import { StopCircle, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EndSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isEnding: boolean;
}

export const EndSessionDialog = ({
  isOpen,
  onClose,
  onConfirm,
  isEnding,
}: EndSessionDialogProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md p-6 rounded-3xl"
            style={{
              background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
              border: "1px solid hsl(217 33% 25% / 0.5)",
              boxShadow: "0 25px 50px -12px hsl(222 47% 5% / 0.8)",
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="text-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, hsl(0 70% 50% / 0.2) 0%, hsl(0 70% 40% / 0.3) 100%)",
                  border: "2px solid hsl(0 70% 50% / 0.4)",
                }}
              >
                <AlertTriangle className="w-10 h-10 text-destructive" />
              </motion.div>

              {/* Text */}
              <h2 className="text-2xl font-bold text-foreground mb-2">
                ¿Finalizar sesión?
              </h2>
              <p className="text-muted-foreground mb-6">
                Esta acción terminará la sesión en vivo para todos los músicos
                conectados. El repertorio quedará marcado como completado.
              </p>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isEnding}
                  className="flex-1 h-12 rounded-xl"
                >
                  Cancelar
                </Button>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1"
                >
                  <Button
                    onClick={onConfirm}
                    disabled={isEnding}
                    className="w-full h-12 rounded-xl bg-destructive hover:bg-destructive/90"
                  >
                    {isEnding ? (
                      <div className="animate-spin">
                        <StopCircle className="w-5 h-5" />
                      </div>
                    ) : (
                      <>
                        <StopCircle className="w-5 h-5 mr-2" />
                        Finalizar
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
