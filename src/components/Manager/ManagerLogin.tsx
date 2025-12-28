import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { User, Lock, Loader2, Layers, ArrowRight } from 'lucide-react';

const ManagerLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Wypełnij wszystkie pola');
      return;
    }

    const success = await login(email, password, 'manager');
    if (success) {
      navigate('/manager/orders');
    } else {
      setError('Nieprawidłowe dane logowania');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="card-industrial shadow-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
              <Layers size={32} className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">
              PLEXI<span className="font-light text-muted-foreground">SYSTEM</span>
            </h1>
            <p className="text-muted-foreground">Panel Kierownika</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Email</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-industrial pl-12"
                  placeholder="kierownik@plexisystem.pl"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">Hasło</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-industrial pl-12"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="btn-primary w-full text-base" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  Logowanie...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Zaloguj się
                  <ArrowRight size={18} />
                </span>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border text-center">
            <button
              onClick={() => navigate('/worker/login')}
              className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm font-medium inline-flex items-center gap-2"
            >
              Przejdź do panelu pracownika
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Version info */}
        <p className="text-center text-muted-foreground/60 text-xs mt-6">
          PlexiSystem v2.0 • System zarządzania produkcją
        </p>
      </div>
    </div>
  );
};

export default ManagerLogin;
