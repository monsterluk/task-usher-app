import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Lock, Loader2, Factory, Users, Briefcase, UserCog } from 'lucide-react';
import { UserRole } from '@/types';

const PinLogin = () => {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const { loginWithPin, loading, currentUser } = useApp();
  const navigate = useNavigate();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Automatyczne przekierowanie po zalogowaniu
  useEffect(() => {
    if (currentUser) {
      redirectToDashboard(currentUser.role);
    }
  }, [currentUser]);

  const redirectToDashboard = (role: UserRole) => {
    // Dwa typy paneli:
    // 1. Manager panel - dla ADMIN, KIEROWNIK, HANDLOWIEC
    // 2. Worker panel - dla PRACOWNIK
    if (role === 'PRACOWNIK') {
      navigate('/worker');
    } else {
      // ADMIN, KIEROWNIK, HANDLOWIEC - wszyscy idą do panelu manager
      navigate('/manager/orders');
    }
  };

  const handlePinChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

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

          {/* Szybkie logowanie */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-4">
              Szybkie logowanie:
            </p>
            <div className="space-y-3">
              {/* ADMIN */}
              <div className="text-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <UserCog size={16} />
                  <span className="font-medium">Administrator:</span>
                </div>
                <div className="flex flex-wrap gap-2 ml-6">
                  <button
                    onClick={() => { setError(''); handleLogin('1234'); }}
                    className="px-3 py-2 text-sm bg-muted rounded-lg hover:bg-primary/20 transition-colors border border-border"
                    disabled={loading}
                  >
                    Łukasz S.
                  </button>
                </div>
              </div>

              {/* KIEROWNIK */}
              <div className="text-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Factory size={16} />
                  <span className="font-medium">Kierownik:</span>
                </div>
                <div className="flex flex-wrap gap-2 ml-6">
                  <button
                    onClick={() => { setError(''); handleLogin('5678'); }}
                    className="px-3 py-2 text-sm bg-muted rounded-lg hover:bg-primary/20 transition-colors border border-border"
                    disabled={loading}
                  >
                    Daniel
                  </button>
                  <button
                    onClick={() => { setError(''); handleLogin('1111'); }}
                    className="px-3 py-2 text-sm bg-muted rounded-lg hover:bg-primary/20 transition-colors border border-border"
                    disabled={loading}
                  >
                    Katarzyna
                  </button>
                  <button
                    onClick={() => { setError(''); handleLogin('2222'); }}
                    className="px-3 py-2 text-sm bg-muted rounded-lg hover:bg-primary/20 transition-colors border border-border"
                    disabled={loading}
                  >
                    Nikola
                  </button>
                </div>
              </div>

              {/* HANDLOWIEC */}
              <div className="text-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Briefcase size={16} />
                  <span className="font-medium">Handlowiec:</span>
                </div>
                <div className="flex flex-wrap gap-2 ml-6">
                  <button
                    onClick={() => { setError(''); handleLogin('7890'); }}
                    className="px-3 py-2 text-sm bg-muted rounded-lg hover:bg-primary/20 transition-colors border border-border"
                    disabled={loading}
                  >
                    Dorota
                  </button>
                </div>
              </div>

              {/* PRACOWNIK */}
              <div className="text-sm">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users size={16} />
                  <span className="font-medium">Pracownik produkcji:</span>
                </div>
                <div className="flex flex-wrap gap-2 ml-6">
                  <button
                    onClick={() => { setError(''); handleLogin('3333'); }}
                    className="px-3 py-2 text-sm bg-muted rounded-lg hover:bg-primary/20 transition-colors border border-border"
                    disabled={loading}
                  >
                    Monika
                  </button>
                  <button
                    onClick={() => { setError(''); handleLogin('6666'); }}
                    className="px-3 py-2 text-sm bg-muted rounded-lg hover:bg-primary/20 transition-colors border border-border"
                    disabled={loading}
                  >
                    Łukasz B.
                  </button>
                  <button
                    onClick={() => { setError(''); handleLogin('7777'); }}
                    className="px-3 py-2 text-sm bg-muted rounded-lg hover:bg-primary/20 transition-colors border border-border"
                    disabled={loading}
                  >
                    Sławomir
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinLogin;
