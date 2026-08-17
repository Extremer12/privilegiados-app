import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navigation } from "./Navigation";
import { LiveSessionInviteModal } from "./live/LiveSessionInviteModal";
import { GlobalOfflineBanner } from "./GlobalOfflineBanner";
import { Loader } from "@/components/ui/loader";

const ContentLoader = () => (
  <div className="flex-1 flex items-center justify-center min-h-[60vh]">
    <Loader />
  </div>
);

export const Layout = () => {
  const location = useLocation();
  const isLivePage = location.pathname.startsWith("/en-vivo");

  return (
    <div className="min-h-screen flex flex-col worship-gradient custom-scrollbar overflow-x-hidden relative">
      <GlobalOfflineBanner />
      <LiveSessionInviteModal />
      {/* Main Content Rendered Here with local Suspense */}
      <Suspense fallback={<ContentLoader />}>
        <Outlet />
      </Suspense>

      {/* Hide navigation on the live page for distraction-free experience */}
      {!isLivePage && <Navigation />}
    </div>
  );
};

