import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ManagerDashboard from "./pages/ManagerDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import ClientsManagement from "./pages/ClientsManagement";
import BarberScheduleBlocks from "./pages/BarberScheduleBlocks";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/painel-gerente"
              element={
                <ProtectedRoute requiredRole="gerente">
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/painel-cliente"
              element={
                <ProtectedRoute requiredRole="cliente">
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gerenciar-clientes"
              element={
                <ProtectedRoute requiredRole="gerente">
                  <ClientsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bloqueios-horarios"
              element={
                <ProtectedRoute requiredRole="gerente">
                  <BarberScheduleBlocks />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
