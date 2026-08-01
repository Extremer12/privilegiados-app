-- Create theory_completions table to track viewed/completed lessons per user
CREATE TABLE IF NOT EXISTS public.theory_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  resource_id UUID REFERENCES public.theory_resources(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, resource_id)
);

-- Enable RLS
ALTER TABLE public.theory_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own completions"
  ON public.theory_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completions"
  ON public.theory_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completions"
  ON public.theory_completions FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_theory_completions_user_resource 
  ON public.theory_completions(user_id, resource_id);
