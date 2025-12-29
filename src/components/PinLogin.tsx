import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Lock, Loader2, Factory, Users, Palette, Briefcase, UserCog } from 'lucide-react';
import { UserRole, ROLE_LABELS } from '@/types';

const PinLogin = () => {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const { loginWithPin, loading, currentUser, workers } = useApp();
  const navigate = useNavigate();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Automatyczne przekierowanie po zalogowaniu
  useEffect(() => {
    if (currentUser) {
      redirectToDashboard(currentUser.role);
    }
  }, [currentUser]);

  const redirectToDashboard = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        navigate('/admin');
        break;
      case 'KIEROWNIK':
        navigate('/manager/orders');
        break;
      case 'GRAFIK':
        navigate('/grafik');
        break;
      case 'HANDLOWIEC':
        navigate('/handlowiec');
        break;
      case 'PRACOWNIK':
        navigate('/worker/stages');
        break;
      default:
        navigate('/');
    }
  };

  const handlePinChange = (index: number, value: string) => {
    // Tylko cyfry
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');

    // Przejdź do następnego pola
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Automatyczne logowanie gdy wszystkie pola wypełnione
    const fullPin = newPin.join('');
    if (fullPin.length >= 4 && newPin.slice(0, 4).every(d => d !== '')) {
      handleLogin(fullPin.slice(0, Math.min(6, newPin.filter(d => d !== '').length)));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const fullPin = pin.join('');
      if (fullPin.length >= 4) {
        handleLogin(fullPin);
      }
    }
  };

  const handleLogin = async (pinValue: string) => {
    if (loading) return;

    const success = await loginWithPin(pinValue);
    if (!success) {
      setError('Nieprawidłowy PIN');
      setPin(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return <UserCog size={16} />;
      case 'KIEROWNIK': return <Factory size={16} />;
      case 'GRAFIK': return <Palette size={16} />;
      case 'HANDLOWIEC': return <Briefcase size={16} />;
      case 'PRACOWNIK': return <Users size={16} />;
      default: return <Users size={16} />;
    }
  };

  // Grupuj pracowników po roli
  const workersByRole = workers.reduce((acc, w) => {
    if (w.active && w.pin) {
      if (!acc[w.role]) acc[w.role] = [];
      acc[w.role].push(w);
    }
    return acc;
  }, {} as Record<string, typeof workers>);

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="card-industrial">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Lock className="text-primary" size={32} />
            </div>
            <h1 className="text-3xl font-bold mb-2">
              PLEXI<span className="font-normal">SYSTEM</span>
            </h1>
            <p className="text-muted-foreground">Wprowadź swój PIN aby się zalogować</p>
          </div>

          <div className="flex justify-center gap-2 mb-6">
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handlePinChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                  ${error ? 'border-destructive' : 'border-border'}
                  ${digit ? 'bg-primary/10' : 'bg-background'}
                `}
                disabled={loading}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {error && (
            <p className="text-destructive text-center text-sm mb-4">{error}</p>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
              <Loader2 className="animate-spin" size={20} />
              <span>Logowanie...</span>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mb-6">
            PIN składa się z 4-6 cyfr
          </p>

          {/* Podpowiedź z dostępnymi PIN-ami (tylko w trybie demo) */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-4">
              Dostępne konta (tryb demo):
            </p>
            <div className="space-y-3">
              {(['ADMIN', 'KIEROWNIK', 'GRAFIK', 'PRACOWNIK'] as UserRole[]).map(role => (
                workersByRole[role] && (
                  <div key={role} className="text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      {getRoleIcon(role)}
                      <span className="font-medium">{ROLE_LABELS[role]}:</span>
                    </div>
                    <div className="flex flex-wrap gap-2 ml-6">
                      {workersByRole[role].map(w => (
                        <button
                          key={w.id}
                          onClick={() => {
                            if (w.pin) {
                              setPin([...w.pin.padEnd(6, '').split('')]);
                              handleLogin(w.pin);
                            }
                          }}
                          className="px-2 py-1 text-xs bg-muted rounded hover:bg-primary/20 transition-colors"
                          disabled={loading}
                        >
                          {w.name.split(' ')[0]} ({w.pin})
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinLogin;
