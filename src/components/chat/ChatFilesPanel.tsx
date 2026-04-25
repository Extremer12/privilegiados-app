import { useMemo } from "react";
import { 
  FileText, Image as ImageIcon, Mic, Search, 
  Download, ExternalLink, Filter, FolderOpen 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FileItem {
  id: string;
  content: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

interface ChatFilesPanelProps {
  messages: any[];
}

export const ChatFilesPanel = ({ messages }: ChatFilesPanelProps) => {
  const allFiles = useMemo(() => {
    return messages
      .filter(m => m.file_url)
      .map(m => ({
        id: m.id,
        content: m.content,
        file_url: m.file_url,
        file_type: m.file_type || 'file',
        created_at: m.created_at
      })) as FileItem[];
  }, [messages]);

  const categorizedFiles = useMemo(() => {
    return {
      all: allFiles,
      images: allFiles.filter(f => f.file_type === 'image'),
      audio: allFiles.filter(f => f.file_type === 'audio'),
      docs: allFiles.filter(f => f.file_type === 'file')
    };
  }, [allFiles]);

  const FileCard = ({ file }: { file: FileItem }) => (
    <Card className="p-3 bg-white/5 border-white/10 hover:bg-white/10 transition-colors mb-3 group">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
          {file.file_type === 'image' && <ImageIcon className="w-6 h-6 text-blue-400" />}
          {file.file_type === 'audio' && <Mic className="w-6 h-6 text-purple-400" />}
          {file.file_type === 'file' && <FileText className="w-6 h-6 text-emerald-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{file.content}</p>
          <p className="text-[10px] text-muted-foreground">
            {new Date(file.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <a 
            href={file.file_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 hover:bg-white/10 rounded-lg text-secondary"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-6 border-b border-white/5">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-secondary" /> Multimedia y Archivos
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {allFiles.length} archivos compartidos en este chat
        </p>
      </div>

      <div className="flex-1 overflow-hidden p-4">
        <Tabs defaultValue="all" className="h-full flex flex-col">
          <TabsList className="bg-black/20 border-white/5 w-full justify-start mb-4 overflow-x-auto no-scrollbar">
            <TabsTrigger value="all" className="data-[state=active]:bg-secondary data-[state=active]:text-primary">Todos</TabsTrigger>
            <TabsTrigger value="images" className="data-[state=active]:bg-secondary data-[state=active]:text-primary">Fotos</TabsTrigger>
            <TabsTrigger value="audio" className="data-[state=active]:bg-secondary data-[state=active]:text-primary">Audios</TabsTrigger>
            <TabsTrigger value="docs" className="data-[state=active]:bg-secondary data-[state=active]:text-primary">Docs</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4">
            <TabsContent value="all" className="m-0">
              {categorizedFiles.all.map(f => <FileCard key={f.id} file={f} />)}
              {categorizedFiles.all.length === 0 && <EmptyState />}
            </TabsContent>
            <TabsContent value="images" className="m-0">
              {categorizedFiles.images.map(f => <FileCard key={f.id} file={f} />)}
              {categorizedFiles.images.length === 0 && <EmptyState />}
            </TabsContent>
            <TabsContent value="audio" className="m-0">
              {categorizedFiles.audio.map(f => <FileCard key={f.id} file={f} />)}
              {categorizedFiles.audio.length === 0 && <EmptyState />}
            </TabsContent>
            <TabsContent value="docs" className="m-0">
              {categorizedFiles.docs.map(f => <FileCard key={f.id} file={f} />)}
              {categorizedFiles.docs.length === 0 && <EmptyState />}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
    <Search className="w-12 h-12 mb-4" />
    <p className="text-sm">No se encontraron archivos en esta categoría</p>
  </div>
);
