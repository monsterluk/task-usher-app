// 🎨 KOLORY ETAPÓW PRODUKCJI
// 12 unikalnych kolorów dla wizualizacji postępu

export const STAGE_COLORS = {
  // Statusy zlecenia
  status: {
    NOWE: { 
      bg: '#6B7280', 
      text: '#FFFFFF', 
      label: '⚪ Nowe',
      description: 'Oczekuje na rozpoczęcie'
    },
    W_TRAKCIE: { 
      bg: '#3B82F6', 
      text: '#FFFFFF', 
      label: '🔵 W trakcie',
      description: 'Aktywnie pracujemy'
    },
    GOTOWE: { 
      bg: '#22C55E', 
      text: '#FFFFFF', 
      label: '🟢 Gotowe',
      description: 'Etap ukończony'
    },
    ZABLOKOWANE: { 
      bg: '#EF4444', 
      text: '#FFFFFF', 
      label: '🔴 Zablokowane',
      description: 'Problem, wymaga interwencji'
    },
    OPÓŹNIONE: { 
      bg: '#F97316', 
      text: '#FFFFFF', 
      label: '🟠 Opóźnione',
      description: 'Przekroczony termin'
    },
    ZAMKNIĘTE: { 
      bg: '#1F2937', 
      text: '#FFFFFF', 
      label: '⚫ Zamknięte',
      description: 'Zlecenie zakończone'
    },
  },
  
  // Etapy produkcji (kolorowe tła dla kart etapów)
  stages: {
    HANDLOWIEC: { 
      bg: '#1E40AF', 
      text: '#FFFFFF', 
      icon: '📋',
      border: '#3B82F6',
      description: 'Obsługa klienta i sprzedaż'
    },
    GRAFIK: { 
      bg: '#7C3AED', 
      text: '#FFFFFF', 
      icon: '🎨',
      border: '#A78BFA',
      description: 'Przygotowanie projektu'
    },
    'FREZOWANIE/LASER': { 
      bg: '#DC2626', 
      text: '#FFFFFF', 
      icon: '⚙️',
      border: '#EF4444',
      description: 'Cięcie i frezowanie CNC'
    },
    POLEROWANIE: { 
      bg: '#92400E', 
      text: '#FFFFFF', 
      icon: '✨',
      border: '#D97706',
      description: 'Polerowanie powierzchni'
    },
    WYGINANIE: { 
      bg: '#C026D3', 
      text: '#FFFFFF', 
      icon: '📐',
      border: '#E879F9',
      description: 'Gięcie i formowanie'
    },
    KLEJENIE: { 
      bg: '#A855F7', 
      text: '#FFFFFF', 
      icon: '🩹',
      border: '#C084FC',
      description: 'Łączenie elementów'
    },
    DRUKOWANIE: { 
      bg: '#EA580C', 
      text: '#FFFFFF', 
      icon: '🖨️',
      border: '#FB923C',
      description: 'Druk cyfrowy i offset'
    },
    OKLEJANIE: { 
      bg: '#D97706', 
      text: '#FFFFFF', 
      icon: '🟣',
      border: '#FBBF24',
      description: 'Oklejanie powierzchni'
    },
    PAKOWANIE: { 
      bg: '#16A34A', 
      text: '#FFFFFF', 
      icon: '📦',
      border: '#4ADE80',
      description: 'Pakowanie gotowych produktów'
    },
    WYSYŁKA: { 
      bg: '#0891B2', 
      text: '#FFFFFF', 
      icon: '🚚',
      border: '#22D3EE',
      description: 'Wysyłka do klienta'
    },
    FAKTURA: { 
      bg: '#CA8A04', 
      text: '#FFFFFF', 
      icon: '📄',
      border: '#EAB308',
      description: 'Dokumentacja i faktury'
    },
    ZAMKNIĘCIE: { 
      bg: '#374151', 
      text: '#FFFFFF', 
      icon: '✅',
      border: '#4B5563',
      description: 'Zakończenie zlecenia'
    },
  },
};

// Funkcja pomocnicza - pobierz kolor dla etapu
export const getStageColor = (stageName: string) => {
  const normalizedName = stageName.toUpperCase().trim();
  return STAGE_COLORS.stages[normalizedName as keyof typeof STAGE_COLORS.stages] 
    || { bg: '#6B7280', text: '#FFFFFF', icon: '📦', border: '#9CA3AF', description: 'Inny etap' };
};

// Funkcja pomocnicza - pobierz kolor dla statusu
export const getStatusColor = (status: string) => {
  const normalizedStatus = status.toUpperCase().trim();
  return STAGE_COLORS.status[normalizedStatus as keyof typeof STAGE_COLORS.status]
    || STAGE_COLORS.status.NOWE;
};

// Komponent Badge z kolorem
export const StageBadge = ({ stageName, size = 'md' }: { stageName: string; size?: 'sm' | 'md' | 'lg' }) => {
  const color = getStageColor(stageName);
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };
  
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: color.bg,
        color: color.text,
        border: `2px solid ${color.border}`
      }}
    >
      <span>{color.icon}</span>
      <span>{stageName}</span>
    </span>
  );
};

// Komponent StatusBadge z kolorem
export const StatusBadge = ({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' | 'lg' }) => {
  const color = getStatusColor(status);
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };
  
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: color.bg,
        color: color.text
      }}
    >
      <span>{color.label.split(' ')[0]}</span>
      <span>{color.label.split(' ').slice(1).join(' ')}</span>
    </span>
  );
};

// Progress bar z kolorami etapów
export const StageProgressBar = ({ 
  stages, 
  currentStage 
}: { 
  stages: string[]; 
  currentStage: string 
}) => {
  const currentIndex = stages.indexOf(currentStage);
  
  return (
    <div className="flex gap-1 w-full">
      {stages.map((stage, index) => {
        const color = getStageColor(stage);
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;
        
        return (
          <div
            key={stage}
            className="flex-1 h-3 rounded-full transition-all"
            style={{
              backgroundColor: isCompleted
                ? color.bg
                : isCurrent
                  ? color.border
                  : '#E5E7EB',
              transform: isCurrent ? 'scaleY(1.5)' : 'scaleY(1)',
            }}
            title={`${stage}${isCompleted ? ' (ukończony)' : isCurrent ? ' (w trakcie)' : ' (oczekuje)'}`}
          />
        );
      })}
    </div>
  );
};

export default STAGE_COLORS;
