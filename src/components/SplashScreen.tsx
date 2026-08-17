import { Loader } from "@/components/ui/loader";

export const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground animate-fade-in">
      <div className="flex flex-col items-center space-y-8 animate-scale-in">
        <div className="relative">
          <div className="absolute inset-0 bg-secondary/20 rounded-full blur-3xl scale-150 animate-pulse" />
          <img 
            src="/logo.jpg" 
            alt="Privilegiados App" 
            className="relative w-32 h-32 rounded-full object-cover ring-4 ring-secondary/40 shadow-2xl"
          />
        </div>
        
        <div className="flex flex-col items-center space-y-3">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Privilegiados App
          </h1>
          <Loader />
        </div>
      </div>
    </div>
  );
};
