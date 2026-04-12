-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('song-audio', 'song-audio', true),
  ('chat-files', 'chat-files', true);

-- Storage policies for song audio
CREATE POLICY "Authenticated users can upload song audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'song-audio');

CREATE POLICY "Anyone can view song audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'song-audio');

CREATE POLICY "Users can delete own song audio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'song-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for chat files
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-files');

CREATE POLICY "Authenticated users can view chat files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-files');

-- Update forum_posts to support file attachments
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS file_type TEXT;