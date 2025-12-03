import { useState } from "react";
import { SERVICES, Service } from "@/lib/services";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Scissors, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ServiceSelector({ value, onChange }: ServiceSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedService = SERVICES.find(s => s.name === value);

  const handleSelect = (serviceName: string) => {
    onChange(serviceName);
    setOpen(false);
  };

  // Agrupar serviços por tipo
  const simpleServices = SERVICES.filter(s => 
    !s.name.includes("+") && !s.name.includes("Cone")
  );
  const comboServices = SERVICES.filter(s => 
    s.name.includes("+") || s.name.includes("Cone")
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between h-auto min-h-[44px] py-2 px-3 text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          {selectedService ? (
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-medium">{selectedService.name}</span>
              <span className="text-xs text-muted-foreground">
                {selectedService.duration} • {selectedService.price}
              </span>
            </div>
          ) : (
            <span className="text-sm">Selecione um serviço</span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            Escolha seu Serviço
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 space-y-4">
            {/* Serviços Simples */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Serviços Básicos
              </h3>
              <div className="grid gap-2">
                {simpleServices.map((service) => (
                  <ServiceCard
                    key={service.name}
                    service={service}
                    isSelected={value === service.name}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>

            {/* Combos */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Combos & Especiais
              </h3>
              <div className="grid gap-2">
                {comboServices.map((service) => (
                  <ServiceCard
                    key={service.name}
                    service={service}
                    isSelected={value === service.name}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface ServiceCardProps {
  service: Service;
  isSelected: boolean;
  onSelect: (name: string) => void;
}

function ServiceCard({ service, isSelected, onSelect }: ServiceCardProps) {
  return (
    <button
      onClick={() => onSelect(service.name)}
      className={cn(
        "w-full p-3 rounded-lg border text-left transition-all duration-200",
        "hover:border-primary/50 hover:bg-primary/5",
        "active:scale-[0.98]",
        isSelected 
          ? "border-primary bg-primary/10 ring-1 ring-primary/20" 
          : "border-border bg-card/50"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium text-sm truncate",
              isSelected && "text-primary"
            )}>
              {service.name}
            </span>
            {isSelected && (
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {service.duration}
            </span>
          </div>
        </div>
        <div className={cn(
          "text-sm font-bold px-2 py-1 rounded-md flex-shrink-0",
          isSelected 
            ? "bg-primary text-primary-foreground" 
            : "bg-secondary text-secondary-foreground"
        )}>
          {service.price}
        </div>
      </div>
    </button>
  );
}
