-- Create table for barber schedule blocks
CREATE TABLE public.barber_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber TEXT NOT NULL,
  block_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_full_day BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT valid_barber_block CHECK (barber IN ('Lucas', 'Luis Felipe')),
  CONSTRAINT valid_time_range CHECK (
    is_full_day = true OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

-- Enable RLS
ALTER TABLE public.barber_blocks ENABLE ROW LEVEL SECURITY;

-- Gerentes can view all blocks
CREATE POLICY "Gerentes can view all blocks"
ON public.barber_blocks
FOR SELECT
USING (has_role(auth.uid(), 'gerente'::user_role));

-- Gerentes can create blocks
CREATE POLICY "Gerentes can create blocks"
ON public.barber_blocks
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'gerente'::user_role));

-- Gerentes can update blocks
CREATE POLICY "Gerentes can update blocks"
ON public.barber_blocks
FOR UPDATE
USING (has_role(auth.uid(), 'gerente'::user_role));

-- Gerentes can delete blocks
CREATE POLICY "Gerentes can delete blocks"
ON public.barber_blocks
FOR DELETE
USING (has_role(auth.uid(), 'gerente'::user_role));

-- Clients can view blocks to see unavailable times
CREATE POLICY "Clients can view blocks"
ON public.barber_blocks
FOR SELECT
USING (has_role(auth.uid(), 'cliente'::user_role));

-- Create index for better performance
CREATE INDEX idx_barber_blocks_date ON public.barber_blocks(barber, block_date);