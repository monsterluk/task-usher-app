import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { User, Lock } from 'lucide-react';

const WorkerLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Wypełnij wszystkie pola');
      return;
    }

    if (login(email, password, 'worker')) {
      navigate('/worker/stages');
    } else {
      setError('Nieprawidłowe dane logowania');
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card-industrial">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">
              PLEXI<span className="font-normal">SYSTEM</span>
            </h1>
            <p className="text-muted-foreground">Panel Pracownika</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-industrial pl-10"
                  placeholder="imie@plexisystem.pl"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Hasło</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-industrial pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full">
              Zaloguj się
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <button
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Przejdź do panelu kierownika →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerLogin;
