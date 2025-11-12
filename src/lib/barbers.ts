import lucasPhoto from "@/assets/barber-lucas.jpeg";
import luisFelipePhoto from "@/assets/barber-luis-felipe.jpeg";

export interface BarberInfo {
  name: string;
  photo?: string;
  specialty?: string;
}

export const BARBERS_INFO: BarberInfo[] = [
  {
    name: "Lucas",
    photo: lucasPhoto,
    specialty: "Especialista em cortes modernos e barba",
  },
  {
    name: "Luis Felipe",
    photo: luisFelipePhoto,
    specialty: "Expert em pigmentação e mechas",
  },
];

export const BARBERS = BARBERS_INFO.map(b => b.name);
export type Barber = typeof BARBERS[number];

export const getBarberInfo = (name: string): BarberInfo | undefined => {
  return BARBERS_INFO.find(b => b.name === name);
};

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
