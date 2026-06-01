import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { 
  X, User, Home, Music, ListMusic, MessageCircle, 
  Users, CalendarDays, BarChart3, ChevronUp, Bell, BellOff, MoreHorizontal, HelpCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { NotificationBell } from "./NotificationBell";
import { GlobalSearch } from "./GlobalSearch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Switch } from "./ui/switch";
import { Sun, Moon } from "lucide-react";

export const Navigation = () => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isSupported, isSubscribed, subscribe, unsubscribe, loading } = usePushNotifications();

  const handleNotificationToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  // Core navigation tabs shown in the bottom bar
  const mainTabs = [
    { name: "Inicio", path: "/", icon: Home },
    { name: "Canciones", path: "/canciones", icon: Music },
    { name: "Repertorios", path: "/repertorios", icon: ListMusic },
    { name: "Foro", path: "/foro", icon: MessageCircle },
  ];

  // Secondary options tucked inside "Más" bottom sheet
  const moreOptions = [
    { name: "Eventos", path: "/eventos", icon: CalendarDays },
    { name: "Miembros", path: "/miembros", icon: Users },
    { name: "Estadísticas", path: "/estadisticas", icon: BarChart3 },
    { name: "Mi Perfil", path: "/perfil", icon: User },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigation = useCallback((path: string) => {
    setIsMoreOpen(false);
    navigate(path);
  }, [navigate]);

  // Close "Más" sheet on route change
  useEffect(() => {
    setIsMoreOpen(false);
  }, [location.pathname]);

  // Prevent background scrolling when bottom sheet is open
  useEffect(() => {
    if (isMoreOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMoreOpen]);

  return (
    <>
      {/* HEADER BAR (Desktop & Mobile Top Slim Bar) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#02040a]/60 backdrop-blur-2xl border-b border-white/[0.04]">
        <nav className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo and Branding */}
            <Link to="/" className="flex items-center space-x-3 group">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 3 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-secondary/10 rounded-full blur-lg" />
                <img
                  src="/logo.jpg"
                  alt="Privilegiados"
                  className="h-10 w-10 md:h-12 md:w-12 object-cover relative z-10 rounded-full border border-white/10"
                />
              </motion.div>
              <span className="hidden sm:block font-black tracking-[0.1em] text-sm md:text-base text-foreground uppercase group-hover:text-secondary transition-colors">
                Privilegiados
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {[...mainTabs, ...moreOptions.slice(0, 3)].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="relative px-4 py-2 rounded-xl group overflow-hidden"
                >
                  {isActive(link.path) && (
                    <motion.div
                      className="absolute inset-0 bg-secondary/15 rounded-xl border border-secondary/10"
                      layoutId="nav-background"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span
                    className={`relative z-10 text-sm font-bold transition-colors ${
                      isActive(link.path)
                        ? "text-secondary"
                        : "text-neutral-400 group-hover:text-foreground"
                    }`}
                  >
                    {link.name}
                  </span>
                </Link>
              ))}
            </div>

            {/* Actions (Search, Notification Bell, Profile) */}
            <div className="flex items-center gap-3">
              {user && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-secondary/15 text-neutral-400 hover:text-secondary border border-white/5 transition-all"
                  title={theme === "dark" ? "Activar Modo Claro" : "Activar Modo Oscuro"}
                >
                  {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
              )}
              {user && <GlobalSearch />}
              {user && <NotificationBell />}
              
              {/* Desktop Profile Button */}
              {user ? (
                <Link to="/perfil" className="hidden md:block">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      variant="hero"
                      size="default"
                      className="flex items-center gap-2 shadow-lg shadow-secondary/15 rounded-xl text-xs font-bold uppercase tracking-wider h-10 px-5"
                    >
                      <User className="w-4 h-4" />
                      Mi Perfil
                    </Button>
                  </motion.div>
                </Link>
              ) : (
                <Link to="/auth" className="hidden md:block">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button variant="hero" size="default" className="rounded-xl h-10 px-5">
                      Iniciar Sesión
                    </Button>
                  </motion.div>
                </Link>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* FLOATING BOTTOM NAVIGATION BAR (Mobile Only) */}
      {user && (
        <nav className="fixed bottom-6 left-4 right-4 z-40 md:hidden bg-[#070c1b]/70 backdrop-blur-2xl border border-white/5 shadow-2xl rounded-2xl px-2 py-2 flex items-center justify-around shadow-black/60">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path) && !isMoreOpen;
            return (
              <button
                key={tab.path}
                onClick={() => handleNavigation(tab.path)}
                className="relative flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-200"
                type="button"
              >
                {active && (
                  <motion.div
                    className="absolute inset-0 bg-secondary/10 rounded-xl"
                    layoutId="active-bottom-indicator"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
                <Icon 
                  className={`w-5.5 h-5.5 transition-transform duration-200 ${
                    active ? "text-secondary scale-110" : "text-neutral-400 active:scale-95"
                  }`} 
                />
                <span className={`text-[9px] mt-1 font-bold tracking-wider ${active ? "text-secondary font-black" : "text-neutral-500"}`}>
                  {tab.name}
                </span>
                {active && (
                  <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-secondary shadow-lg shadow-secondary" />
                )}
              </button>
            );
          })}

          {/* "Más" Toggle Button */}
          <button
            onClick={() => setIsMoreOpen(prev => !prev)}
            className={`relative flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-200 ${
              isMoreOpen ? "bg-white/[0.05]" : ""
            }`}
            type="button"
            aria-expanded={isMoreOpen}
            aria-label="Ver más opciones"
          >
            <MoreHorizontal 
              className={`w-5.5 h-5.5 transition-transform duration-300 ${
                isMoreOpen ? "text-secondary rotate-90 scale-110" : "text-neutral-400"
              }`} 
            />
            <span className={`text-[9px] mt-1 font-bold tracking-wider ${isMoreOpen ? "text-secondary font-black" : "text-neutral-500"}`}>
              Más
            </span>
          </button>
        </nav>
      )}

      {/* MOBILE BOTTOM SHEET FOR "MÁS" OPTIONS */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="fixed inset-0 z-45 bg-black/60 backdrop-blur-sm md:hidden"
            />

            {/* Bottom Sheet Menu */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-24 left-4 right-4 z-50 md:hidden bg-[#070c1b]/95 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-3xl p-5 shadow-black/80 flex flex-col max-h-[70vh] overflow-y-auto"
            >
              {/* Header inside Bottom Sheet */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-full border border-white/10" />
                  <div>
                    <span className="font-extrabold text-sm text-foreground block tracking-wider uppercase">Privilegiados</span>
                    <span className="text-[10px] text-muted-foreground/60 font-semibold">Opciones de la Plataforma</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.06] active:bg-white/[0.12] text-foreground transition-colors"
                  type="button"
                >
                  <ChevronUp className="w-4 h-4 rotate-180 text-neutral-400" />
                </button>
              </div>

              {/* Grid of More Options */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {moreOptions.map((option) => {
                  const Icon = option.icon;
                  const active = isActive(option.path);
                  return (
                    <button
                      key={option.path}
                      onClick={() => handleNavigation(option.path)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 border text-left ${
                        active
                          ? "bg-secondary/15 text-secondary border-secondary/20 shadow-md shadow-secondary/5"
                          : "bg-white/[0.02] text-foreground/90 border-white/[0.04] active:bg-white/[0.08]"
                      }`}
                      type="button"
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? "bg-secondary/20" : "bg-white/5"}`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-sm font-bold">{option.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Theme Toggle row */}
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${theme === "dark" ? "bg-white/5" : "bg-secondary/10"}`}>
                    {theme === "dark" ? <Moon className="w-4.5 h-4.5 text-neutral-400" /> : <Sun className="w-4.5 h-4.5 text-secondary animate-pulse" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">Modo Claro</span>
                    <span className="text-[9px] text-muted-foreground/60 font-semibold">{theme === "light" ? "Activado" : "Desactivado"}</span>
                  </div>
                </div>
                <Switch 
                  checked={theme === "light"} 
                  onCheckedChange={toggleTheme}
                  className="scale-90"
                />
              </div>

              {/* Native Push Notification Toggle */}
              {isSupported && (
                <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSubscribed ? "bg-secondary/10" : "bg-white/5"}`}>
                      {isSubscribed ? <Bell className="w-4.5 h-4.5 text-secondary animate-pulse" /> : <BellOff className="w-4.5 h-4.5 text-neutral-500" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">Notificaciones Push</span>
                      <span className="text-[9px] text-muted-foreground/60 font-semibold">{isSubscribed ? "Activadas" : "Desactivadas"}</span>
                    </div>
                  </div>
                  <Switch 
                    checked={isSubscribed} 
                    onCheckedChange={handleNotificationToggle}
                    disabled={loading}
                    className="scale-90"
                  />
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
