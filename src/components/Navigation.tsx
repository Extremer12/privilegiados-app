import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Menu, X, User, Home, Music, ListMusic, MessageCircle, Users, CalendarDays, ChevronRight, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "./NotificationBell";
import { GlobalSearch } from "./GlobalSearch";

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const navLinks = [
    { name: "Inicio", path: "/", icon: Home },
    { name: "Canciones", path: "/canciones", icon: Music },
    { name: "Repertorios", path: "/repertorios", icon: ListMusic },
    { name: "Foro", path: "/foro", icon: MessageCircle },
    { name: "Miembros", path: "/miembros", icon: Users },
    { name: "Eventos", path: "/eventos", icon: CalendarDays },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Auto-close mobile menu on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const menuVariants = {
    closed: {
      opacity: 0,
      y: "-100%",
      transition: {
        duration: 0.4,
        ease: [0.32, 0.72, 0, 1], // easeOutQuint
        when: "afterChildren",
      },
    },
    open: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1], // easeOutQuint
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    closed: { opacity: 0, y: 20, scale: 0.95 },
    open: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-xl border-b border-border/50">
        <nav className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <div
                  className="absolute inset-0 bg-secondary/30 rounded-full blur-xl"
                />
                <img
                  src="/logo.jpg"
                  alt="Privilegiados App"
                  className="h-14 w-14 object-contain relative z-10 rounded-full"
                />
              </motion.div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="relative px-4 py-2 rounded-xl group"
                >
                  <motion.div
                    className={`absolute inset-0 rounded-xl ${
                      isActive(link.path)
                        ? "bg-secondary/20"
                        : "bg-transparent group-hover:bg-secondary/10"
                    } transition-colors`}
                    layoutId="nav-background"
                  />
                  <span
                    className={`relative z-10 text-sm font-medium transition-colors ${
                      isActive(link.path)
                        ? "text-secondary"
                        : "text-foreground group-hover:text-secondary"
                    }`}
                  >
                    {link.name}
                  </span>
                  {isActive(link.path) && (
                    <motion.div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-secondary rounded-full"
                      layoutId="nav-indicator"
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* CTA Button */}
            <div className="hidden md:flex items-center gap-3">
              {user && <GlobalSearch />}
              {user && <NotificationBell />}
              {user ? (
                <Link to="/perfil">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="hero"
                      size="default"
                      className="flex items-center gap-2 shadow-lg shadow-secondary/20"
                    >
                      <User className="w-4 h-4" aria-hidden="true" />
                      Mi Perfil
                    </Button>
                  </motion.div>
                </Link>
              ) : (
                <Link to="/auth">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="hero" size="default">
                      Iniciar Sesión
                    </Button>
                  </motion.div>
                </Link>
              )}
            </div>

            {/* Mobile Search & Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              {user && <GlobalSearch />}
              <motion.button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-12 h-12 flex items-center justify-center rounded-xl bg-secondary/10 text-foreground hover:bg-secondary/20 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Toggle menu"
              >
                <AnimatePresence mode="wait">
                  {isOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X size={24} className="text-secondary" aria-hidden="true" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu size={24} aria-hidden="true" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          </div>
        </nav>
      </header>

      {/* Full-Screen Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed top-0 left-0 w-full h-[100dvh] z-[100] bg-background/98 backdrop-blur-3xl flex flex-col md:hidden"
          >
            <div className="flex items-center justify-between p-4 px-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-full" />
                <span className="font-black tracking-tight text-xl">Privilegiados</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(false)}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-foreground transition-colors"
                aria-label="Cerrar menú"
              >
                <X size={24} />
              </motion.button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4">
              {navLinks.map((link, index) => {
                const active = isActive(link.path);
                return (
                  <motion.div
                    key={link.path}
                    variants={itemVariants}
                    custom={index}
                  >
                    <Link
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-5 p-4 rounded-3xl transition-all active:scale-[0.96] ${
                        active
                          ? "bg-secondary text-primary-foreground shadow-xl shadow-secondary/20"
                          : "bg-secondary/5 text-foreground active:bg-secondary/15"
                      }`}
                    >
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                          active
                            ? "bg-white/20 text-white"
                            : "bg-background text-muted-foreground"
                        }`}
                      >
                        <link.icon className="w-7 h-7" aria-hidden="true" />
                      </div>
                      <span className={`text-xl font-bold flex-1 tracking-wide ${active ? "text-white" : ""}`}>{link.name}</span>
                      {active && (
                        <ChevronRight
                          className="w-6 h-6 text-white/70"
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}

              <motion.div variants={itemVariants} className="pt-6 pb-2">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-border/50 to-transparent" />
              </motion.div>

              {/* Mobile Notifications */}
              {user && (
                <motion.div variants={itemVariants} className="flex justify-center pb-4">
                  <div className="flex items-center gap-4 px-6 py-4 rounded-3xl bg-secondary/5 border border-white/5">
                    <span className="font-semibold text-muted-foreground">Notificaciones</span>
                    <NotificationBell />
                  </div>
                </motion.div>
              )}

              {/* Profile/Auth Button */}
              <motion.div variants={itemVariants} className="pb-8">
                {user ? (
                  <Link to="/perfil" onClick={() => setIsOpen(false)}>
                    <Button
                      variant="hero"
                      size="lg"
                      className="w-full flex items-center justify-center gap-3 h-16 rounded-3xl text-lg font-bold shadow-xl shadow-secondary/20 active:scale-[0.98] transition-all"
                    >
                      <User className="w-6 h-6" />
                      Mi Perfil
                    </Button>
                  </Link>
                ) : (
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button 
                      variant="hero" 
                      size="lg" 
                      className="w-full h-16 rounded-3xl text-lg font-bold shadow-xl shadow-secondary/20 active:scale-[0.98] transition-all"
                    >
                      Iniciar Sesión
                    </Button>
                  </Link>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
