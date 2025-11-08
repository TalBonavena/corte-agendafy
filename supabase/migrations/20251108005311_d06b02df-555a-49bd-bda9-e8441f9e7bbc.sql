-- Security fix: Add database-level validation constraints for appointments table
-- Ensure data integrity even if client-side validation is bypassed

-- Add check constraint for notes length (max 500 characters)
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_notes_length_check 
CHECK (notes IS NULL OR length(notes) <= 500);

-- Add check constraint for service name length (max 100 characters)
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_service_length_check 
CHECK (length(service) > 0 AND length(service) <= 100);

-- Add check constraint for barber name length (max 100 characters)
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_barber_length_check 
CHECK (length(barber) > 0 AND length(barber) <= 100);

-- Add check constraint for time format validation (HH:MM format)
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_time_format_check 
CHECK (scheduled_time::text ~ '^([0-1][0-9]|2[0-3]):[0-5][0-9]:00$');