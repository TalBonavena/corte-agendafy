export interface Service {
  name: string;
  duration: string;
  price: string;
}

export const SERVICES: Service[] = [
  { name: "Acabamento", duration: "5min", price: "R$ 7,00" },
  { name: "Acabamento+Barba", duration: "30min", price: "R$ 32,00" },
  { name: "Acabamento+Barba+Sobrancelha", duration: "30min", price: "R$ 39,00" },
  { name: "Barba", duration: "25min", price: "R$ 25,00" },
  { name: "Corte", duration: "30min", price: "R$ 30,00" },
  { name: "Cone Hidu", duration: "25min", price: "R$ 15,00" },
  { name: "Cone Hidu+Corte", duration: "1hr", price: "R$ 45,00" },
  { name: "Corte+Barba", duration: "1hr", price: "R$ 55,00" },
  { name: "Corte+Barba+Sobrancelha", duration: "1hr", price: "R$ 62,00" },
  { name: "Corte+Depilação Nasal", duration: "1hr", price: "R$ 45,00" },
  { name: "Corte+Sobrancelha", duration: "30min", price: "R$ 37,00" },
];

export const formatServiceDisplay = (service: Service): string => {
  return `${service.name} - ${service.duration} - ${service.price}`;
};
