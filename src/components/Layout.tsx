import { Outlet, useLocation } from "react-router-dom";
import { Navigation } from "./Navigation";
import { LiveSessionInviteModal } from "./live/LiveSessionInviteModal";

export const Layout = () => {
  const location = useLocation();
  const isLivePage = location.pathname.startsWith("/en-vivo");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary via-primary/95 to-primary/80 custom-scrollbar overflow-x-hidden relative">
      <LiveSessionInviteModal />
      {/* Main Content Rendered Here */}
      <Outlet />

      {/* Hide navigation on the live page for distraction-free experience */}
      {!isLivePage && <Navigation />}
    </div>
  );
};
