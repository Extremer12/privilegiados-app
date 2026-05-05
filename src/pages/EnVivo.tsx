import { useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// UI Components
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader } from "@/components/ui/loader";
import { AddSongToSetlistDialog } from "@/components/repertorios/AddSongToSetlistDialog";
import { SECTION_TYPES, SectionType } from "@/components/repertorios/types";

// Live specific components
import { LiveHeader } from "@/components/live/LiveHeader";
import { LyricsDisplay } from "@/components/live/LyricsDisplay";
import { SongListPanel } from "@/components/live/SongListPanel";
import { LiveChat } from "@/components/live/LiveChat";
import { EndSessionDialog } from "@/components/live/EndSessionDialog";
import { PresentationView } from "@/components/live/PresentationView";
import { BottomControls } from "@/components/live/BottomControls";
import { LiveParticipantsPanel } from "@/components/live/LiveParticipantsPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Hooks
import { useLiveSession } from "@/hooks/useLiveSession";
import { usePresentationMode } from "@/hooks/usePresentationMode";

const EnVivo = () => {
  const { id } = useParams<{ id: string }>();

  // 1. Core Session Logic Hook
  const {
    session,
    setlist,
    songs,
    comments,
    loading,
    initialParticipants,
    currentSong,
    nextSong,
    isCreator,
    canEndSession,
    isLeader,
    handleNavigateSong,
    handleJumpToSong,
    handleDeleteSong,
    handleEndSession,
    addComment,
  } = useLiveSession(id);

  // 2. Presentation Mode Hook
  const {
    isPresentationMode,
    presentationTheme,
    presentationFontSize,
    isFullscreen,
    toggleTheme,
    increaseFontSize,
    decreaseFontSize,
    toggleFullscreen,
    openPresentationMode,
    closePresentationMode,
  } = usePresentationMode();

  // 3. UI View States
  const [activePanel, setActivePanel] = useState<"songs" | "chat" | "participants" | null>("songs");
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  
  // Dialog state for adding songs
  const [showAddSong, setShowAddSong] = useState(false);
  const [selectedSection, setSelectedSection] = useState<SectionType>("alabanza");
  const [songToDelete, setSongToDelete] = useState<string | null>(null);

  // Panel toggles — only one panel active at a time on mobile, multiple on desktop
  const togglePanel = (panel: "songs" | "chat" | "participants") => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  // Handle saving the report and navigating
  const onConfirmEndSession = async (data: any) => {
    setIsEnding(true);
    const success = await handleEndSession(data);
    if (!success) setIsEnding(false);
    // If success, hook navigates away
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/80">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader />
          <p className="mt-4 text-foreground/80 animate-pulse">
            Cargando sesión en vivo...
          </p>
        </motion.div>
      </div>
    );
  }

  // Early return if in presentation mode
  if (isPresentationMode && currentSong) {
    return (
      <PresentationView
        currentSong={currentSong}
        isCreator={isCreator}
        theme={presentationTheme}
        fontSize={presentationFontSize}
        onThemeToggle={toggleTheme}
        onIncreaseFont={increaseFontSize}
        onDecreaseFont={decreaseFontSize}
        onClose={closePresentationMode}
        onNavigate={handleNavigateSong}
      />
    );
  }

  const showRightPanel = activePanel !== null;

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(222 47% 6%) 0%, hsl(222 47% 10%) 50%, hsl(222 47% 6%) 100%)",
        }}
      >
        {/* Ambient background effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full opacity-30"
            style={{
              background: "radial-gradient(circle, hsl(48 100% 50% / 0.08) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full opacity-30"
            style={{
              background: "radial-gradient(circle, hsl(217 91% 60% / 0.04) 0%, transparent 70%)",
            }}
          />
        </div>

        {/* Header */}
        <div className="sticky top-0 z-50 px-4 pt-3 pb-2 max-w-7xl mx-auto">
          <LiveHeader 
            setlistTitle={setlist?.title || "Cargando..."}
            sessionStartedAt={session?.started_at}
            currentPosition={session?.current_position || 0}
            totalSongs={songs.length}
          />
        </div>

        {/* Main Layout Area */}
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-4 relative z-10 h-[calc(100vh-120px)]">
          
          {/* Main Stage (Lyrics) */}
          <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative">
            <div className="absolute inset-0 flex flex-col pb-[72px]">
              <LyricsDisplay
                currentSong={currentSong}
                nextSong={nextSong}
                currentPosition={session?.current_position || 0}
                totalSongs={songs.length}
                isCreator={isCreator}
                onPrevious={() => handleNavigateSong("prev")}
                onNext={() => handleNavigateSong("next")}
                onPresentationMode={openPresentationMode}
              />
            </div>
          </div>

          {/* Right Panels — Desktop */}
          <AnimatePresence mode="wait">
            {showRightPanel && (
              <motion.div 
                initial={{ opacity: 0, x: 20, width: 0 }}
                animate={{ opacity: 1, x: 0, width: "340px" }}
                exit={{ opacity: 0, x: 20, width: 0 }}
                className="hidden md:flex flex-col gap-3 overflow-hidden h-full pb-[72px] shrink-0"
              >
                {activePanel === "participants" && session && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1 overflow-hidden"
                  >
                    <LiveParticipantsPanel sessionId={session.id} />
                  </motion.div>
                )}

                {activePanel === "songs" && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1 overflow-hidden"
                  >
                    <SongListPanel
                      songs={songs}
                      currentPosition={session?.current_position || 0}
                      onSongSelect={isCreator ? handleJumpToSong : undefined}
                      isCreator={isCreator}
                      onDeleteSong={(id) => setSongToDelete(id)}
                      onAddSong={(section) => {
                        setSelectedSection(section as SectionType);
                        setShowAddSong(true);
                      }}
                    />
                  </motion.div>
                )}

                {activePanel === "chat" && session && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1 overflow-hidden"
                  >
                    <LiveChat 
                      sessionId={session.id}
                      comments={comments}
                      onAddComment={addComment}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile Overlay Panels */}
          <AnimatePresence>
            <div className="md:hidden">
              {activePanel === "songs" && (
                <motion.div
                  initial={{ opacity: 0, y: "100%" }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col"
                  style={{
                    background: "linear-gradient(145deg, hsl(222 47% 8%) 0%, hsl(222 47% 5%) 100%)",
                  }}
                >
                  {/* Mobile close bar */}
                  <div className="flex items-center justify-center py-2 shrink-0">
                    <button
                      onClick={() => setActivePanel(null)}
                      className="w-10 h-1 rounded-full bg-white/20"
                    />
                  </div>
                  <div className="flex-1 overflow-hidden px-3 pb-20">
                    <SongListPanel
                      songs={songs}
                      currentPosition={session?.current_position || 0}
                      onSongSelect={(pos) => {
                        if (isCreator) handleJumpToSong(pos);
                        setActivePanel(null);
                      }}
                      isCreator={isCreator}
                      onDeleteSong={(id) => setSongToDelete(id)}
                      onAddSong={(section) => {
                        setSelectedSection(section as SectionType);
                        setShowAddSong(true);
                        setActivePanel(null);
                      }}
                    />
                  </div>
                </motion.div>
              )}

              {activePanel === "chat" && session && (
                <motion.div
                  initial={{ opacity: 0, y: "100%" }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col"
                  style={{
                    background: "linear-gradient(145deg, hsl(222 47% 8%) 0%, hsl(222 47% 5%) 100%)",
                  }}
                >
                  <div className="flex items-center justify-center py-2 shrink-0">
                    <button
                      onClick={() => setActivePanel(null)}
                      className="w-10 h-1 rounded-full bg-white/20"
                    />
                  </div>
                  <div className="flex-1 overflow-hidden px-3 pb-20">
                    <LiveChat 
                      sessionId={session.id}
                      comments={comments}
                      onAddComment={addComment}
                    />
                  </div>
                </motion.div>
              )}

              {activePanel === "participants" && session && (
                <motion.div
                  initial={{ opacity: 0, y: "100%" }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col"
                  style={{
                    background: "linear-gradient(145deg, hsl(222 47% 8%) 0%, hsl(222 47% 5%) 100%)",
                  }}
                >
                  <div className="flex items-center justify-center py-2 shrink-0">
                    <button
                      onClick={() => setActivePanel(null)}
                      className="w-10 h-1 rounded-full bg-white/20"
                    />
                  </div>
                  <div className="flex-1 overflow-hidden px-3 pb-20">
                    <LiveParticipantsPanel sessionId={session.id} />
                  </div>
                </motion.div>
              )}
            </div>
          </AnimatePresence>
        </div>

        {/* Bottom Controls Bar */}
        <BottomControls
          showSongList={activePanel === "songs"}
          setShowSongList={() => togglePanel("songs")}
          showChat={activePanel === "chat"}
          setShowChat={() => togglePanel("chat")}
          showParticipants={activePanel === "participants"}
          setShowParticipants={() => togglePanel("participants")}
          commentsCount={comments.length}
          songsCount={songs.length}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          canEndSession={canEndSession}
          onEndSessionClick={() => setShowEndDialog(true)}
        />

        {/* End session dialog */}
        {session && (
          <EndSessionDialog
            isOpen={showEndDialog}
            onClose={() => setShowEndDialog(false)}
            onConfirm={onConfirmEndSession}
            isEnding={isEnding}
            setlistSongs={songs}
            sessionId={session.id}
          />
        )}

        {/* Add Song Dialog */}
        {session?.setlist_id && (
          <AddSongToSetlistDialog
            open={showAddSong}
            onOpenChange={setShowAddSong}
            section={selectedSection}
            setlistId={session.setlist_id}
            currentPosition={songs.filter(s => s.section === selectedSection).length + 1}
            onSongAdded={() => {
              // Realtime hook handles list update automatically
              setShowAddSong(false);
            }}
          />
        )}
      </motion.div>

      <AlertDialog open={!!songToDelete} onOpenChange={(open) => !open && setSongToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Remover canción?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas remover esta canción del repertorio en vivo? Esta acción se sincronizará con todos los participantes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                if (songToDelete) {
                  handleDeleteSong(songToDelete, e as any);
                  setSongToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

export default EnVivo;
