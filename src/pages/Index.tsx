import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users } from "lucide-react";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.jpeg";

const Index = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && userRole) {
      navigate(userRole === "gerente" ? "/painel-gerente" : "/painel-cliente");
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <img 
            src={logo} 
            alt="Logo Barbearia Master" 
            className="w-40 h-40 object-contain mb-6 animate-scale-in hover-scale drop-shadow-[0_0_25px_rgba(255,255,255,0.8)] border-4 border-white rounded-2xl p-4 bg-gradient-to-br from-background/10 to-background/5 backdrop-blur-sm" 
          />
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Barbearia Master
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Sistema Profissional de Agendamento para Barbearias
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="btn-futuristic text-lg px-8" 
              onClick={() => navigate("/auth")}
            >
              AGENDAMENTO
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-16">
          <div className="glass-panel p-6 text-center rounded-xl">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-4">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Agendamento Fácil</h3>
            <p className="text-muted-foreground">
              Sistema intuitivo para agendar seus horários de forma rápida e prática
            </p>
          </div>

          <div className="glass-panel p-6 text-center rounded-xl">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-4">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Gestão de Horários</h3>
            <p className="text-muted-foreground">
              Controle total sobre os agendamentos e horários disponíveis
            </p>
          </div>

          <div className="glass-panel p-6 text-center rounded-xl">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Gestão de Clientes</h3>
            <p className="text-muted-foreground">
              Mantenha o histórico completo de atendimentos de cada cliente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
