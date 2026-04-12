import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function NotificationBell() {
  const {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
    sendTestNotification
  } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          {isSubscribed ? (
            <BellRing className="h-5 w-5 text-secondary" />
          ) : (
            <Bell className="h-5 w-5 text-muted-foreground" />
          )}
          {isSubscribed && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-card border-border/50" align="end">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-semibold text-foreground">Notificaciones Push</h4>
            <p className="text-sm text-muted-foreground">
              Recibe alertas de eventos, nuevas canciones y más
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications" className="text-foreground">
                {isSubscribed ? "Activadas" : "Desactivadas"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {permission === 'denied' 
                  ? "Bloqueadas en el navegador" 
                  : "Activa para recibir alertas"}
              </p>
            </div>
            <Switch
              id="notifications"
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={loading || permission === 'denied'}
            />
          </div>

          {permission === 'denied' && (
            <p className="text-xs text-destructive">
              Las notificaciones están bloqueadas. Habilítalas desde la configuración del navegador.
            </p>
          )}

          {isSubscribed && (
            <>
              <Separator className="bg-border/50" />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Recibirás notificaciones de:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Recordatorios de eventos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    Nuevas canciones agregadas
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    Nuevos miembros
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    Anuncios importantes
                  </li>
                </ul>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={sendTestNotification}
              >
                Enviar notificación de prueba
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}