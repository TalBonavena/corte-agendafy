export const BARBERS = ["Lucas", "Luis Felipe"] as const;
export type Barber = typeof BARBERS[number];

// Horários disponíveis (09:00 às 19:00)
export const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 9; hour < 19; hour++) {
    slots.push(`${hour.toString().padStart(2, "0")}:00`);
    slots.push(`${hour.toString().padStart(2, "0")}:30`);
  }
  return slots;
};

export const TIME_SLOTS = generateTimeSlots();
