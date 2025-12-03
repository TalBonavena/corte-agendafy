-- Allow clients to update their own appointments (for cancellation)
CREATE POLICY "Clients can cancel own appointments"
ON public.appointments
FOR UPDATE
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);