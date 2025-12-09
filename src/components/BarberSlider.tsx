import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import lucasBatista from "@/assets/barber-lucas-batista.jpeg";
import felipeLima from "@/assets/barber-felipe-lima.jpeg";
const barbers = [{
  name: "Lucas Batista",
  role: "Dono / Educador",
  image: lucasBatista
}, {
  name: "Felipe Lima",
  role: "Colaborador / Líder",
  image: felipeLima
}];
export default function BarberSlider() {
  return <div className="w-full max-w-4xl mx-auto mt-16">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
        Nossa Equipe
      </h2>
      <Carousel opts={{
      align: "center",
      loop: true
    }} plugins={[Autoplay({
      delay: 4000
    })]} className="w-full">
        <CarouselContent>
          {barbers.map((barber, index) => <CarouselItem key={index} className="md:basis-1/1">
              <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="flex flex-col md:flex-row items-center">
                  <div className="w-full md:w-1/2 p-8 text-center md:text-left">
                    <p className="text-sm text-muted-foreground uppercase tracking-wider mb-4">
                      Innovation Barbearia
                    </p>
                    <h3 className="text-3xl md:text-4xl font-bold mb-4">
                      {barber.name}
                    </h3>
                    <p className="text-xl md:text-2xl text-primary font-semibold uppercase">
                      {barber.role}
                    </p>
                  </div>
                  <div className="w-full md:w-1/2">
                    <img src={barber.image} alt={barber.name} className="w-full h-64 md:h-80 object-contain" />
                  </div>
                </div>
              </div>
            </CarouselItem>)}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
    </div>;
}