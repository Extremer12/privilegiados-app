import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Menu, X, User, Home, Music, ListMusic, MessageCircle, Users, CalendarDays, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "./NotificationBell";

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

  const menuVariants = {
    closed: {
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
    open: {
      opacity: 1,
      height: "auto",
      transition: {
        duration: 0.3,
        staggerChildren: 0.07,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    closed: { opacity: 0, x: -20 },
    open: { opacity: 1, x: 0 },
  };

  return (
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
            {user && <NotificationBell />}
            {user ? (
              <Link to="/perfil">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="hero"
                    size="default"
                    className="flex items-center gap-2 shadow-lg shadow-secondary/20"
                  >
                    <User className="w-4 h-4" />
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

          {/* Mobile Menu Button */}
          <motion.button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden relative w-12 h-12 flex items-center justify-center rounded-xl bg-secondary/10 text-foreground hover:bg-secondary/20 transition-colors"
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
                  <X size={24} className="text-secondary" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={24} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              variants={menuVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 space-y-2">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.path}
                    variants={itemVariants}
                    custom={index}
                  >
                    <Link
                      to={link.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                        isActive(link.path)
                          ? "bg-secondary/20 text-secondary"
                          : "text-foreground hover:bg-secondary/10 hover:text-secondary"
                      }`}
                    >
                      <motion.div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isActive(link.path)
                            ? "bg-secondary/30"
                            : "bg-secondary/10"
                        }`}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <link.icon className="w-6 h-6" />
                      </motion.div>
                      <span className="text-lg font-semibold flex-1">{link.name}</span>
                      <ChevronRight
                        className={`w-5 h-5 transition-transform ${
                          isActive(link.path) ? "text-secondary" : "text-muted-foreground"
                        }`}
                      />
                    </Link>
                  </motion.div>
                ))}

                {/* Separator */}
                <motion.div
                  variants={itemVariants}
                  className="border-t border-border/50 my-4"
                />

                {/* Notifications */}
                {user && (
                  <motion.div
                    variants={itemVariants}
                    className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10"
                  >
                    <span className="text-base font-semibold text-foreground">
                      Notificaciones
                    </span>
                    <NotificationBell />
                  </motion.div>
                )}

                {/* Profile/Auth Button */}
                <motion.div variants={itemVariants}>
                  {user ? (
                    <Link to="/perfil" onClick={() => setIsOpen(false)}>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          variant="hero"
                          size="lg"
                          className="w-full flex items-center gap-3 h-14 text-lg shadow-lg shadow-secondary/20"
                        >
                          <User className="w-5 h-5" />
                          Mi Perfil
                        </Button>
                      </motion.div>
                    </Link>
                  ) : (
                    <Link to="/auth" onClick={() => setIsOpen(false)}>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button variant="hero" size="lg" className="w-full h-14 text-lg">
                          Iniciar Sesión
                        </Button>
                      </motion.div>
                    </Link>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};
