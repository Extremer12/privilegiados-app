import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Ruta no encontrada:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center worship-gradient p-4">
      <motion.div
        className="text-center max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* 404 Number */}
        <motion.div
          className="relative mb-6"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <span className="text-[120px] md:text-[160px] font-black bg-gradient-to-b from-secondary/60 to-secondary/10 bg-clip-text text-transparent leading-none select-none">
            404
          </span>
          <div className="absolute inset-0 bg-secondary/10 rounded-full blur-[80px] -z-10" />
        </motion.div>

        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          Página no encontrada
        </h1>
        <p className="text-muted-foreground mb-8 text-base">
          La página que buscas no existe o fue movida.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gold-gradient text-primary font-semibold hover:shadow-[0_0_30px_hsl(48_100%_50%/0.4)] transition-all duration-300 hover:scale-105 w-full sm:w-auto justify-center">
              <Home className="w-4 h-4" />
              Ir al Inicio
            </button>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-secondary/30 text-foreground font-semibold hover:bg-secondary/10 transition-all duration-300 w-full sm:w-auto justify-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver Atrás
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
