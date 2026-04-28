import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
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

const Particles = () => {
  const particles = Array.from({ length: 25 }).map((_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 10,
  }));

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-yellow-500/50"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            boxShadow: `0 0 ${p.size * 3}px rgba(234, 179, 8, 0.8)`,
          }}
          animate={{
            y: [0, -800],
            x: [0, Math.random() * 100 - 50],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

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
      toast.error("Error de autenticación", {
        description: message,
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-end pb-16 relative overflow-hidden bg-black">
      {/* Background Image with Slow Zoom & Gradient Overlay */}
      <motion.div 
        className="absolute inset-0 z-0"
        initial={{ scale: 1.15 }}
        animate={{ scale: 1.05 }}
        transition={{ duration: 25, ease: "linear", repeat: Infinity, repeatType: "mirror" }}
        style={{
          backgroundImage: "url('/login.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e17] via-[#0a0e17]/60 to-transparent" />
      </motion.div>

      {/* Gold Particles */}
      <Particles />

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-3 drop-shadow-2xl">
            PRIVILEGIADOS
            <br/>
            APP
          </h1>
          <div className="h-1 w-20 bg-secondary mx-auto rounded-full shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="w-full"
        >
          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-[60px] rounded-2xl bg-white text-black font-bold text-[15px] transition-all duration-300 active:scale-[0.97] hover:bg-gray-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.25)] disabled:opacity-50 disabled:pointer-events-none shadow-2xl relative overflow-hidden group"
          >
            {/* Subtle button shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-black/5 to-transparent skew-x-12" />
            
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            ) : (
              <>
                <GoogleIcon />
                <span>INICIAR SESIÓN CON GOOGLE</span>
              </>
            )}
          </button>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-[10px] text-white uppercase tracking-[0.25em] font-bold"
        >
          Ministerio de Alabanza
        </motion.p>
      </div>
    </div>
  );
};

export default Auth;