import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Menu, X, User, Home, Music, ListMusic, MessageCircle, Users, CalendarDays, BarChart3, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "./NotificationBell";
import { GlobalSearch } from "./GlobalSearch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Switch } from "./ui/switch";
import { Bell, BellOff } from "lucide-react";

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSupported, isSubscribed, subscribe, unsubscribe, loading } = usePushNotifications();

  const handleNotificationToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const navLinks = [
    { name: "Inicio", path: "/", icon: Home },
    { name: "Canciones", path: "/canciones", icon: Music },
    { name: "Repertorios", path: "/repertorios", icon: ListMusic },
    { name: "Foro", path: "/foro", icon: MessageCircle },
    { name: "Miembros", path: "/miembros", icon: Users },
    { name: "Estadísticas", path: "/estadisticas", icon: BarChart3 },
    { name: "Eventos", path: "/eventos", icon: CalendarDays },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Close menu function — always works, no conditions
  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Navigate and close menu — guaranteed to close
  const handleNavigation = useCallback((path: string) => {
    setIsOpen(false);
    // Small delay to let the menu close visually before navigating
    setTimeout(() => {
      navigate(path);
    }, 50);
  }, [navigate]);

  // Also close on route change as a safety net
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [isOpen]);

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
                <div className="absolute inset-0 bg-secondary/30 rounded-full blur-xl" />
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

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              {user && <GlobalSearch />}
              <button
                onClick={() => setIsOpen(prev => !prev)}
                className="relative w-12 h-12 flex items-center justify-center rounded-xl bg-secondary/10 text-foreground active:bg-secondary/20 transition-colors"
                aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
                aria-expanded={isOpen}
                type="button"
              >
                {isOpen ? (
                  <X size={24} className="text-secondary" aria-hidden="true" />
                ) : (
                  <Menu size={24} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Full-Screen Mobile Menu Overlay — uses CSS transitions, NOT AnimatePresence */}
      <div
        className={`fixed inset-0 z-[100] md:hidden transition-all duration-300 ease-out ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={closeMenu}
          aria-hidden="true"
        />

        {/* Menu Panel */}
        <div
          className={`absolute inset-0 bg-gradient-to-b from-[#0d1117] via-[#0f1419] to-[#0d1117] flex flex-col transition-transform duration-300 ease-out ${
            isOpen ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          {/* Menu Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Logo" className="w-11 h-11 rounded-full ring-2 ring-secondary/30" />
              <div>
                <span className="font-black tracking-tight text-lg text-foreground block leading-tight">Privilegiados</span>
                <span className="text-xs text-muted-foreground/60 font-medium">Ministerio de Alabanza</span>
              </div>
            </div>
            <button
              onClick={closeMenu}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/[0.06] active:bg-white/[0.12] text-foreground transition-colors"
              aria-label="Cerrar menú"
              type="button"
            >
              <X size={22} />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6">
            <div className="space-y-2">
              {navLinks.map((link, index) => {
                const active = isActive(link.path);
                const Icon = link.icon;
                return (
                  <button
                    key={link.path}
                    onClick={() => handleNavigation(link.path)}
                    type="button"
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 active:scale-[0.97] ${
                      active
                        ? "bg-secondary text-white shadow-lg shadow-secondary/25"
                        : "bg-white/[0.03] text-foreground/90 active:bg-white/[0.08]"
                    }`}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                        active
                          ? "bg-white/20"
                          : "bg-white/[0.05]"
                      }`}
                    >
                      <Icon className={`w-5.5 h-5.5 ${active ? "text-white" : "text-muted-foreground"}`} aria-hidden="true" />
                    </div>
                    <span className={`text-[17px] font-semibold flex-1 text-left ${active ? "text-white" : ""}`}>
                      {link.name}
                    </span>
                    {active && (
                      <div className="w-2 h-2 rounded-full bg-white/80" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

            {/* Notifications Toggle - Mobile Native */}
            {user && isSupported && (
              <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-white/[0.03] mb-4 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSubscribed ? "bg-secondary/20" : "bg-white/5"}`}>
                    {isSubscribed ? <Bell className="w-5 h-5 text-secondary" /> : <BellOff className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-foreground block">Notificaciones</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{isSubscribed ? "Activadas" : "Desactivadas"}</span>
                  </div>
                </div>
                <Switch 
                  checked={isSubscribed} 
                  onCheckedChange={handleNotificationToggle}
                  disabled={loading}
                />
              </div>
            )}

            {/* Profile / Auth Button */}
            <div className="pb-safe">
              {user ? (
                <button
                  onClick={() => handleNavigation("/perfil")}
                  type="button"
                  className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl bg-secondary text-white font-bold text-base shadow-lg shadow-secondary/25 active:scale-[0.98] active:opacity-90 transition-all"
                >
                  <User className="w-5 h-5" />
                  Mi Perfil
                </button>
              ) : (
                <button
                  onClick={() => handleNavigation("/auth")}
                  type="button"
                  className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl bg-secondary text-white font-bold text-base shadow-lg shadow-secondary/25 active:scale-[0.98] active:opacity-90 transition-all"
                >
                  Iniciar Sesión
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
