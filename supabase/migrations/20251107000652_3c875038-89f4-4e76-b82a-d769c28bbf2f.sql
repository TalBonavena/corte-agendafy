-- Enable realtime for appointments table
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- Enable realtime for barber_blocks table (para bloqueios também)
ALTER PUBLICATION supabase_realtime ADD TABLE public.barber_blocks;