import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Ocurrió un error inesperado";
      toast({
        title: "Error de autenticación",
        description: message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e11] relative overflow-hidden">
      {/* Subtle ambient light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-secondary/[0.04] rounded-full blur-[120px] pointer-events-none" />

      {/* Main content — vertically centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-10"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-secondary/15 rounded-full blur-2xl scale-125" />
            <img
              src="/logo.jpg"
              alt="Privilegiados App"
              className="relative w-32 h-32 rounded-full object-cover ring-[3px] ring-white/10 shadow-2xl"
            />
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            Privilegiados
          </h1>
          <p className="text-[15px] text-white/40 font-light">
            Ministerio de Alabanza
          </p>
        </motion.div>
      </div>

      {/* Bottom section — Google button + footer */}
      <motion.div
        className="px-6 pb-10 pt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {/* Google Login Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 h-[56px] rounded-2xl bg-white text-[#1f1f1f] font-medium text-[15px] transition-all duration-200 active:scale-[0.98] hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-black/20"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
          ) : (
            <>
              <GoogleIcon />
              <span>Continuar con Google</span>
            </>
          )}
        </button>

        {/* Terms */}
        <p className="text-center text-[11px] text-white/25 mt-6 leading-relaxed">
          Al continuar, aceptas los términos de uso
          <br />
          y la política de privacidad.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;