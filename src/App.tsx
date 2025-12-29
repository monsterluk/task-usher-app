import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import Index from "./pages/Index";
import PinLogin from "./components/PinLogin";
import WorkerLogin from "./components/Worker/WorkerLogin";
import ManagerDashboard from "./pages/ManagerDashboard";
import WorkerDashboard from "./pages/WorkerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import GrafikDashboard from "./pages/GrafikDashboard";
import HandlowiecDashboard from "./pages/HandlowiecDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Główna strona - przekierowanie do logowania PIN-em */}
            <Route path="/" element={<PinLogin />} />
            <Route path="/login" element={<PinLogin />} />

            {/* Stary ekran logowania (fallback) */}
            <Route path="/worker/login" element={<WorkerLogin />} />

            {/* Panele ról */}
            <Route path="/admin/*" element={<AdminDashboard />} />
            <Route path="/manager/*" element={<ManagerDashboard />} />
            <Route path="/kierownik/*" element={<Navigate to="/manager" replace />} />
            <Route path="/grafik/*" element={<GrafikDashboard />} />
            <Route path="/handlowiec/*" element={<HandlowiecDashboard />} />
            <Route path="/worker/*" element={<WorkerDashboard />} />
            <Route path="/pracownik/*" element={<Navigate to="/worker/stages" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
