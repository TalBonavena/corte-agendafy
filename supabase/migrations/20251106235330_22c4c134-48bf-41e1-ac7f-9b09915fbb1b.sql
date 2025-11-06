-- Add barber column to appointments table
ALTER TABLE public.appointments ADD COLUMN barber TEXT NOT NULL DEFAULT 'Lucas';

-- Add check constraint to ensure valid barber names
ALTER TABLE public.appointments 
ADD CONSTRAINT valid_barber 
CHECK (barber IN ('Lucas', 'Luis Felipe'));

-- Create index for better performance when filtering by barber and date
CREATE INDEX idx_appointments_barber_date ON public.appointments(barber, scheduled_date, scheduled_time);