import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, CheckCheck, Loader2, FileText, Paperclip, Mic, Pencil, Trash2, X, Check as CheckIcon } from "lucide-react";
import { AudioPlayer } from "./AudioPlayer";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface ChatMessageProps {
  id: string;
  content: string;
  file_url: string | null;
  file_type: string | null;
  created_at: string;
  author_id: string;
  status?: "sending" | "sent" | "error";
  isOwnMessage: boolean;
  author: Profile | undefined;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, content: string) => void;
}

export const ChatMessage = ({
  id,
  content,
  file_url,
  file_type,
  created_at,
  status,
  isOwnMessage,
  author,
  onDelete,
  onUpdate,
}: ChatMessageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);
  const authorName = author?.full_name || "Usuario";
  const authorAvatar = author?.avatar_url;

  const createdAtDate = new Date(created_at);
  const isEditable = isOwnMessage && (new Date().getTime() - createdAtDate.getTime()) < 30 * 60 * 1000;

  const handleUpdate = () => {
    if (editValue.trim() && editValue !== content && onUpdate) {
      onUpdate(id, editValue);
    }
    setIsEditing(false);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["pdf"].includes(ext || "")) return <FileText className="w-4 h-4" />;
    if (["doc", "docx"].includes(ext || "")) return <FileText className="w-4 h-4" />;
    if (["mp3", "wav", "m4a", "webm", "ogg"].includes(ext || "")) return <Mic className="w-4 h-4" />;
    return <Paperclip className="w-4 h-4" />;
  };

  const getStatusIcon = (msgStatus?: "sending" | "sent" | "error") => {
    if (msgStatus === "sending") return <Loader2 className="w-3 h-3 animate-spin" />;
    if (msgStatus === "sent") return <CheckCheck className="w-3 h-3 text-secondary" />;
    if (msgStatus === "error") return <span className="text-destructive text-xs font-semibold">Error</span>;
    return <Check className="w-3 h-3 text-muted-foreground" />;
  };

  const isAudioFile = (url: string | null, type: string | null) => {
    if (type === "audio") return true;
    if (!url) return false;
    const ext = url.split(".").pop()?.toLowerCase();
    return ["mp3", "wav", "m4a", "webm", "ogg"].includes(ext || "");
  };

  return (
    <div className={`flex gap-3 mb-4 animate-fade-in ${isOwnMessage ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-secondary/20 shadow-lg">
        <AvatarImage src={authorAvatar || undefined} />
        <AvatarFallback className="bg-gradient-to-br from-secondary/30 to-secondary/10 text-secondary font-bold text-sm">
          {authorName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} max-w-[75%]`}>
        <p className={`text-xs font-semibold mb-1.5 ${isOwnMessage ? "text-secondary" : "text-muted-foreground"}`}>
          {isOwnMessage ? "Tú" : authorName}
        </p>

        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={`${
                isOwnMessage
                  ? "bg-gradient-to-br from-secondary/25 to-secondary/15 border border-secondary/30 rounded-2xl rounded-tr-sm"
                  : "bg-gradient-to-br from-card to-card/80 border border-border/50 rounded-2xl rounded-tl-sm"
              } p-3 shadow-lg transition-all hover:shadow-xl relative`}
            >
              {/* Image */}
              {file_url && file_type === "image" && (
                <img src={file_url} alt="Imagen compartida" className="rounded-xl max-w-full h-auto mb-2 shadow-md" />
              )}

              {/* Audio */}
              {file_url && isAudioFile(file_url, file_type) && (
                <AudioPlayer src={file_url} isOwnMessage={isOwnMessage} />
              )}

              {/* Other Files */}
              {file_url && !isAudioFile(file_url, file_type) && file_type !== "image" && (
                <a
                  href={file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-secondary hover:text-secondary/80 transition-colors mb-2 font-medium"
                >
                  {getFileIcon(content)}
                  <span className="underline">{content}</span>
                </a>
              )}

              {/* Text Content / Edit Input */}
              {isEditing ? (
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="bg-background/50 border-secondary/30 h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                  />
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => setIsEditing(false)}>
                      <X className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-secondary" onClick={handleUpdate}>
                      <CheckIcon className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                content && !file_url && <p className="text-foreground break-words">{content}</p>
              )}

              {/* Timestamp and Status */}
              <div className="flex items-center gap-2 mt-2">
                <p className="text-[10px] text-muted-foreground">
                  {createdAtDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </p>
                {isOwnMessage && <span className="text-muted-foreground">{getStatusIcon(status)}</span>}
              </div>
            </div>
          </ContextMenuTrigger>

          {(isOwnMessage || isEditable) && (
            <ContextMenuContent className="bg-card/95 backdrop-blur-xl border-border/50 rounded-xl shadow-2xl p-1">
              {isEditable && !file_url && (
                <ContextMenuItem 
                  className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg cursor-pointer hover:bg-secondary/10 hover:text-secondary transition-colors"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="w-4 h-4" />
                  Editar mensaje
                </ContextMenuItem>
              )}
              {isOwnMessage && (
                <ContextMenuItem 
                  className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg cursor-pointer text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={() => onDelete && onDelete(id)}
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar mensaje
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          )}
        </ContextMenu>
      </div>
    </div>
  );
};
