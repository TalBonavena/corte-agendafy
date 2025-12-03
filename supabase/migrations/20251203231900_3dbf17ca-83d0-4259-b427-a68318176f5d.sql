-- Drop the old constraint and create a new one with correct barber names
ALTER TABLE public.appointments DROP CONSTRAINT valid_barber;

ALTER TABLE public.appointments ADD CONSTRAINT valid_barber 
CHECK (barber = ANY (ARRAY['Lucas Batista'::text, 'Luis Felipe'::text]));