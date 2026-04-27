import { Outlet } from "react-router-dom";
import { Navigation } from "./Navigation";
import { LiveSessionInviteModal } from "./live/LiveSessionInviteModal";

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary via-primary/95 to-primary/80 custom-scrollbar overflow-x-hidden relative">
      <LiveSessionInviteModal />
      {/* Main Content Rendered Here */}
      <Outlet />

      <Navigation />
    </div>
  );
};
