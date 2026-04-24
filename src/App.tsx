import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SplashScreen } from "@/components/SplashScreen";
import { Loader } from "@/components/ui/loader";
import { Layout } from "@/components/Layout";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Canciones = lazy(() => import("./pages/Canciones"));
const SongDetail = lazy(() => import("./pages/SongDetail"));
const Auth = lazy(() => import("./pages/Auth"));
const Foro = lazy(() => import("./pages/Foro"));
const Miembros = lazy(() => import("./pages/Miembros"));
const Eventos = lazy(() => import("./pages/Eventos"));
const Repertorios = lazy(() => import("./pages/Repertorios"));
const RepertorioDetalle = lazy(() => import("./pages/RepertorioDetalle"));
const EnVivo = lazy(() => import("./pages/EnVivo"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ManageSong = lazy(() => import("./pages/ManageSong"));
const Estadisticas = lazy(() => import("./pages/Estadisticas"));

// Optimized QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Route loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/80">
    <Loader />
  </div>
);

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash on first visit per session
    return !sessionStorage.getItem("splash_shown");
  });

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
        sessionStorage.setItem("splash_shown", "true");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/auth" element={<Auth />} />
                  {/* Layout wrapper for protected and catch-all routes */}
                  <Route element={<Layout />}>
                    {/* Protected routes */}
                    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                    <Route path="/canciones" element={<ProtectedRoute><Canciones /></ProtectedRoute>} />
                    <Route path="/canciones/nueva" element={<ProtectedRoute><ManageSong /></ProtectedRoute>} />
                    <Route path="/canciones/:id/editar" element={<ProtectedRoute><ManageSong /></ProtectedRoute>} />
                    <Route path="/canciones/:id" element={<ProtectedRoute><SongDetail /></ProtectedRoute>} />
                    <Route path="/foro" element={<ProtectedRoute><Foro /></ProtectedRoute>} />
                    <Route path="/miembros" element={<ProtectedRoute><Miembros /></ProtectedRoute>} />
                    <Route path="/eventos" element={<ProtectedRoute><Eventos /></ProtectedRoute>} />
                    <Route path="/estadisticas" element={<ProtectedRoute><Estadisticas /></ProtectedRoute>} />
                    <Route path="/repertorios" element={<ProtectedRoute><Repertorios /></ProtectedRoute>} />
                    <Route path="/repertorios/:id" element={<ProtectedRoute><RepertorioDetalle /></ProtectedRoute>} />
                    <Route path="/en-vivo/:id" element={<ProtectedRoute><EnVivo /></ProtectedRoute>} />
                    <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/perfil/:id" element={<ProtectedRoute><PublicProfile /></ProtectedRoute>} />

                    {/* Catch-all */}
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
