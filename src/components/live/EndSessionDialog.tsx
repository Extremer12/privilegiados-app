import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StopCircle, X, Users, Music, FileText, Plus, Trash2, Star, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ServiceParticipantInput {
  name: string;
  role: string;
  user_id?: string;
}

export interface ServiceSongInput {
  song_id: string;
  title: string;
  was_improvised: boolean;
  played: boolean;
}

export interface FinalizeServiceData {
  participants: ServiceParticipantInput[];
  songs: ServiceSongInput[];
  notes: string;
  attendance_count: number;
  leader_rating: number;
}

interface EndSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: FinalizeServiceData) => void;
  isEnding: boolean;
  setlistSongs: any[];
  sessionId: string;
}

const ROLES = ["Líder", "Cantante", "Guitarra", "Bajo", "Batería", "Teclado", "Sonido", "Multimedia", "Otro"];

export const EndSessionDialog = ({
  isOpen,
  onClose,
  onConfirm,
  isEnding,
  setlistSongs,
  sessionId,
}: EndSessionDialogProps) => {
  const [step, setStep] = useState(0); // 0: warning, 1: participants, 2: songs, 3: notes
  
  const [participants, setParticipants] = useState<ServiceParticipantInput[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [songs, setSongs] = useState<ServiceSongInput[]>([]);
  const [notes, setNotes] = useState("");
  const [attendance, setAttendance] = useState("");
  const [rating, setRating] = useState(0);

  // Initialize data when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchProfiles();
      fetchConfirmedParticipants();
      if (setlistSongs.length > 0 && songs.length === 0) {
        setSongs(setlistSongs.map(s => ({
          song_id: s.songs.id,
          title: s.songs.title,
          was_improvised: false,
          played: true
        })));
      }
    }
  }, [isOpen, setlistSongs, sessionId]);

  const fetchConfirmedParticipants = async () => {
    const { data } = await import("@/integrations/supabase/client").then(m => m.supabase)
      .from('live_session_participants')
      .select('user_id, role_in_service, profiles(full_name)')
      .eq('session_id', sessionId)
      .eq('status', 'confirmed');
      
    if (data && data.length > 0) {
      setParticipants(data.map((p: any) => ({
        user_id: p.user_id,
        name: p.profiles?.full_name || '',
        role: p.role_in_service || 'Cantante'
      })));
    } else {
      setParticipants([]);
    }
  };

  const fetchProfiles = async () => {
    const { data } = await import("@/integrations/supabase/client").then(m => m.supabase)
      .from('profiles')
      .select('id, full_name, avatar_url')
      .order('full_name');
    if (data) setProfiles(data);
  };

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setStep(0);
        setParticipants([]);
        setSongs([]);
        setNotes("");
        setAttendance("");
        setRating(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleToggleParticipant = (profileId: string, name: string) => {
    if (participants.some(p => p.user_id === profileId)) {
      setParticipants(prev => prev.filter(p => p.user_id !== profileId));
    } else {
      setParticipants(prev => [...prev, { user_id: profileId, name, role: 'Cantante' }]);
    }
  };

  const handleUpdateRole = (profileId: string, role: string) => {
    setParticipants(prev => prev.map(p => p.user_id === profileId ? { ...p, role } : p));
  };

  const toggleSongPlayed = (index: number) => {
    const newSongs = [...songs];
    newSongs[index].played = !newSongs[index].played;
    setSongs(newSongs);
  };

  const handleFinalSubmit = () => {
    // Filter out empty participant names
    const validParticipants = participants.filter(p => p.name.trim() !== "");
    
    onConfirm({
      participants: validParticipants,
      songs,
      notes,
      attendance_count: parseInt(attendance) || 0,
      leader_rating: rating
    });
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  const filteredProfiles = profiles.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step === 0 ? onClose : undefined}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg rounded-3xl overflow-hidden my-auto relative"
              style={{
                background: "linear-gradient(145deg, hsl(217 33% 14%) 0%, hsl(222 47% 8%) 100%)",
                border: "1px solid hsl(217 33% 25% / 0.5)",
                boxShadow: "0 25px 50px -12px hsl(222 47% 5% / 0.8)",
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-6 md:p-8">
                {/* Progress Indicator */}
                {step > 0 && (
                  <div className="flex justify-center mb-6 gap-2">
                    {[1, 2, 3].map(i => (
                      <div 
                        key={i} 
                        className={`h-2 rounded-full transition-all duration-300 ${step >= i ? 'bg-secondary w-8' : 'bg-white/10 w-4'}`} 
                      />
                    ))}
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {/* STEP 0: Confirmation Warning */}
                  {step === 0 && (
                    <motion.div key="step0" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="text-center">
                      <motion.div
                        className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-red-500/20 border-2 border-red-500/40"
                      >
                        <AlertTriangle className="w-10 h-10 text-red-500" />
                      </motion.div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">Finalizar Culto</h2>
                      <p className="text-muted-foreground mb-8">
                        Estás a punto de finalizar la sesión en vivo. A continuación, te pediremos algunos datos para generar las estadísticas del servicio.
                      </p>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-xl border-white/10">
                          Cancelar
                        </Button>
                        <Button onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl bg-secondary text-primary hover:bg-secondary/90 font-bold">
                          Continuar <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 1: Participants */}
                  {step === 1 && (
                    <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-secondary/20 rounded-xl">
                          <Users className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">Participantes</h2>
                          <p className="text-sm text-muted-foreground">¿Quiénes sirvieron hoy?</p>
                        </div>
                      </div>

                      <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
                        <div className="relative mb-4">
                          <Input 
                            placeholder="Buscar miembros..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/5 border-white/10 h-10 rounded-xl"
                          />
                        </div>

                        <div className="grid gap-2">
                          {filteredProfiles.map(profile => {
                            const isSelected = participants.some(p => p.user_id === profile.id);
                            const currentParticipant = participants.find(p => p.user_id === profile.id);
                            
                            return (
                              <div 
                                key={profile.id}
                                className={`flex flex-col gap-2 p-3 rounded-xl border transition-all duration-300 ${
                                  isSelected ? "bg-secondary/10 border-secondary/30" : "bg-white/5 border-white/5"
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold border border-white/10">
                                      {profile.full_name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-bold text-sm text-white">{profile.full_name}</p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleToggleParticipant(profile.id, profile.full_name)}
                                    className={`rounded-lg h-8 w-8 transition-all ${
                                      isSelected ? "bg-secondary text-primary-foreground" : "bg-white/5 text-white/40"
                                    }`}
                                  >
                                    {isSelected ? <CheckCircle2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                  </Button>
                                </div>

                                {isSelected && (
                                  <div className="flex items-center gap-2 pt-2 border-t border-secondary/20 mt-1">
                                    <select
                                      value={currentParticipant?.role || "Cantante"}
                                      onChange={(e) => handleUpdateRole(profile.id, e.target.value)}
                                      className="bg-black/40 border border-white/10 rounded-lg h-8 px-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-secondary w-full"
                                    >
                                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-3 mt-8">
                        <Button variant="outline" onClick={() => setStep(0)} className="h-12 rounded-xl px-4">
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => setStep(2)} className="flex-1 h-12 rounded-xl bg-secondary text-primary hover:bg-secondary/90 font-bold">
                          Siguiente
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: Songs played */}
                  {step === 2 && (
                    <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-emerald-500/20 rounded-xl">
                          <Music className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">Canciones Tocadas</h2>
                          <p className="text-sm text-muted-foreground">Desmarca las que no se cantaron</p>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
                        {songs.map((song, i) => (
                          <div 
                            key={i} 
                            onClick={() => toggleSongPlayed(i)}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                              song.played 
                                ? "bg-emerald-500/10 border-emerald-500/30" 
                                : "bg-white/5 border-white/10 opacity-50"
                            }`}
                          >
                            <span className="font-medium line-clamp-1 flex-1 pr-4">{song.title}</span>
                            {song.played ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-white/20 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3 mt-8">
                        <Button variant="outline" onClick={() => setStep(1)} className="h-12 rounded-xl px-4">
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => setStep(3)} className="flex-1 h-12 rounded-xl bg-secondary text-primary hover:bg-secondary/90 font-bold">
                          Siguiente
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: Report & Submit */}
                  {step === 3 && (
                    <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                          <FileText className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">Resumen</h2>
                          <p className="text-sm text-muted-foreground">Datos finales del culto</p>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Tu valoración personal del servicio</Label>
                          <div className="flex justify-center gap-2 py-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setRating(star)}
                                className={`p-2 rounded-full transition-all ${rating >= star ? 'text-amber-400 scale-110' : 'text-white/20 hover:text-white/40'}`}
                              >
                                <Star className={`w-8 h-8 ${rating >= star ? 'fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : ''}`} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Asistencia Estimada (Opcional)</Label>
                          <Input 
                            type="number" 
                            placeholder="Ej. 150" 
                            value={attendance}
                            onChange={e => setAttendance(e.target.value)}
                            className="bg-white/5 border-white/10 h-12 rounded-xl"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-muted-foreground">Observaciones / Notas (Opcional)</Label>
                          <Textarea 
                            placeholder="¿Hubo algo especial? ¿Problemas técnicos?" 
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="bg-white/5 border-white/10 min-h-[100px] rounded-xl resize-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 mt-8">
                        <Button variant="outline" onClick={() => setStep(2)} disabled={isEnding} className="h-12 rounded-xl px-4">
                          <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <Button 
                          onClick={handleFinalSubmit} 
                          disabled={isEnding}
                          className="flex-1 h-12 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold"
                        >
                          {isEnding ? (
                            <StopCircle className="w-5 h-5 animate-spin" />
                          ) : (
                            <>Guardar y Finalizar</>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
