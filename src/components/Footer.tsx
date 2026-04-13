import { Link } from "react-router-dom";
import { Music } from "lucide-react";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card/50 border-t border-border mt-20">
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Logo and Quote */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                <Music className="w-5 h-5 text-secondary" aria-hidden="true" />
              </div>
              <span className="text-lg font-bold text-secondary">
                Privilegiados App
              </span>
            </div>
            <p className="text-sm text-muted-foreground italic">
              "Todo lo que respira alabe al Señor"
              <br />
              <span className="text-secondary">- Salmo 150:6</span>
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-foreground font-semibold mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-secondary transition-colors text-sm">
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/canciones" className="text-muted-foreground hover:text-secondary transition-colors text-sm">
                  Canciones
                </Link>
              </li>
              <li>
                <Link to="/foro" className="text-muted-foreground hover:text-secondary transition-colors text-sm">
                  Foro
                </Link>
              </li>
              <li>
                <Link to="/eventos" className="text-muted-foreground hover:text-secondary transition-colors text-sm">
                  Eventos
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Privilegiados App. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
