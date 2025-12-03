import { useState } from "react";
import { BARBERS_INFO, BarberInfo } from "@/lib/barbers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarberSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function BarberSelector({ value, onChange }: BarberSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedBarber = BARBERS_INFO.find(b => b.name === value);

  const handleSelect = (barberName: string) => {
    onChange(barberName);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between h-auto min-h-[44px] py-2 px-3 text-left font-normal",
            "transition-all duration-200 hover:border-primary/50 hover:shadow-md",
            !value && "text-muted-foreground"
          )}
        >
          {selectedBarber ? (
            <div className="flex items-center gap-3">
              {selectedBarber.photo ? (
                <img
                  src={selectedBarber.photo}
                  alt={selectedBarber.name}
                  className="w-8 h-8 rounded-full object-cover border border-border transition-transform duration-200"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex flex-col items-start gap-0">
                <span className="text-sm font-medium">{selectedBarber.name}</span>
                {selectedBarber.specialty && (
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {selectedBarber.specialty}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-sm">Selecione um barbeiro</span>
          )}
          <ChevronDown className={cn(
            "h-4 w-4 shrink-0 opacity-50 transition-transform duration-200",
            open && "rotate-180"
          )} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] p-0 gap-0 animate-scale-in">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary animate-fade-in" />
            Escolha seu Barbeiro
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="p-4 grid gap-3">
            {BARBERS_INFO.map((barber, index) => (
              <BarberCard
                key={barber.name}
                barber={barber}
                isSelected={value === barber.name}
                onSelect={handleSelect}
                delay={index * 100}
              />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface BarberCardProps {
  barber: BarberInfo;
  isSelected: boolean;
  onSelect: (name: string) => void;
  delay?: number;
}

function BarberCard({ barber, isSelected, onSelect, delay = 0 }: BarberCardProps) {
  return (
    <button
      onClick={() => onSelect(barber.name)}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "w-full p-4 rounded-xl border text-left transition-all duration-200",
        "hover:border-primary/50 hover:bg-primary/5 hover:shadow-lg hover:scale-[1.02]",
        "active:scale-[0.98]",
        "animate-fade-in",
        isSelected 
          ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-md" 
          : "border-border bg-card/50"
      )}
    >
      <div className="flex items-center gap-4">
        {barber.photo ? (
          <img
            src={barber.photo}
            alt={barber.name}
            className={cn(
              "w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 transition-all duration-300",
              isSelected ? "border-primary scale-105 shadow-lg" : "border-border"
            )}
          />
        ) : (
          <div className={cn(
            "w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border-2 transition-all duration-300",
            isSelected ? "border-primary bg-primary/20 scale-105" : "border-border bg-secondary"
          )}>
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-semibold text-base sm:text-lg transition-colors duration-200",
              isSelected && "text-primary"
            )}>
              {barber.name}
            </span>
            {isSelected && (
              <Check className="h-5 w-5 text-primary flex-shrink-0 animate-scale-in" />
            )}
          </div>
          {barber.specialty && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              {barber.specialty}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
