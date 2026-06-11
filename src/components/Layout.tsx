import { Outlet, useLocation } from "react-router-dom";
import { Navigation } from "./Navigation";
import { LiveSessionInviteModal } from "./live/LiveSessionInviteModal";
import { GlobalOfflineBanner } from "./GlobalOfflineBanner";

export const Layout = () => {
  const location = useLocation();
  const isLivePage = location.pathname.startsWith("/en-vivo");

  return (
    <div className="min-h-screen flex flex-col worship-gradient custom-scrollbar overflow-x-hidden relative">
      <GlobalOfflineBanner />
      <LiveSessionInviteModal />
      {/* Main Content Rendered Here */}
      <Outlet />

      {/* Hide navigation on the live page for distraction-free experience */}
      {!isLivePage && <Navigation />}
    </div>
  );
};
