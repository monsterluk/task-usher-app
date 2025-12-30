import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { integrationsApi, isDemoMode } from '@/utils/api';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Plug,
  Settings,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  TestTube,
  FileText,
  Truck,
  ShoppingCart,
  Package,
  AlertCircle,
  Clock
} from 'lucide-react';

interface Integration {
  id: number;
  name: string;
  display_name: string;
  description: string;
  provider: string;
  is_enabled: boolean;
  config: Record<string, any>;
  credentials: Record<string, any>;
  last_sync_at: string | null;
  last_error: string | null;
}

interface IntegrationLog {
  id: number;
  action: string;
  status: string;
  request_data: any;
  response_data: any;
  error_message: string | null;
  created_at: string;
}

const PROVIDER_ICONS: Record<string, any> = {
  wfirma: FileText,
  apaczka: Truck,
  baselinker: ShoppingCart,
  allegro: Package,
};

const IntegrationsPanel = () => {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showCredentials, setShowCredentials] = useState<Record<string, boolean>>({});
  const [editedCredentials, setEditedCredentials] = useState<Record<string, string>>({});
  const [editedConfig, setEditedConfig] = useState<Record<string, any>>({});

  const demoMode = isDemoMode();

  const loadIntegrations = useCallback(async () => {
    if (demoMode) {
      // Demo data
      setIntegrations([
        {
          id: 1,
          name: 'wfirma',
          display_name: 'wFirma.pl',
          description: 'Integracja z systemem fakturowania wFirma.pl',
          provider: 'wfirma',
          is_enabled: false,
          config: { api_url: 'https://api2.wfirma.pl' },
          credentials: {},
          last_sync_at: null,
          last_error: null,
        },
        {
          id: 2,
          name: 'apaczka',
          display_name: 'Apaczka.pl',
          description: 'Integracja z Apaczka.pl - nadawanie przesylek kurierskich',
          provider: 'apaczka',
          is_enabled: false,
          config: { api_url: 'https://www.apaczka.pl/api/v2' },
          credentials: {},
          last_sync_at: null,
          last_error: null,
        },
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await integrationsApi.getAll();
      if (response.success && response.data?.integrations) {
        setIntegrations(response.data.integrations);
      }
    } catch (error: any) {
      console.error('Failed to load integrations:', error);
      toast({
        title: 'Blad',
        description: 'Nie udalo sie pobrac listy integracji',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [demoMode]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const loadLogs = async (name: string) => {
    if (demoMode) {
      setLogs([]);
      return;
    }

    try {
      const response = await integrationsApi.getLogs(name, 20);
      if (response.success && response.data?.logs) {
        setLogs(response.data.logs);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const selectIntegration = async (integration: Integration) => {
    setSelectedIntegration(integration);
    setEditedCredentials(integration.credentials || {});
    setEditedConfig(integration.config || {});
    await loadLogs(integration.name);
  };

  const handleSave = async () => {
    if (!selectedIntegration || demoMode) {
      toast({ title: 'Tryb demo', description: 'Zapis niedostepny w trybie demo' });
      return;
    }

    setSaving(true);
    try {
      const response = await integrationsApi.update(selectedIntegration.name, {
        credentials: editedCredentials,
        config: editedConfig,
      });

      if (response.success) {
        toast({ title: 'Zapisano', description: 'Konfiguracja integracji zostala zapisana' });
        await loadIntegrations();
        if (response.data?.integration) {
          setSelectedIntegration(response.data.integration);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Blad',
        description: error.response?.data?.message || 'Nie udalo sie zapisac konfiguracji',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!selectedIntegration || demoMode) return;

    setSaving(true);
    try {
      const response = await integrationsApi.update(selectedIntegration.name, {
        is_enabled: !selectedIntegration.is_enabled,
      });

      if (response.success) {
        toast({
          title: selectedIntegration.is_enabled ? 'Wylaczono' : 'Wlaczono',
          description: `Integracja ${selectedIntegration.display_name} zostala ${selectedIntegration.is_enabled ? 'wylaczona' : 'wlaczona'}`,
        });
        await loadIntegrations();
        if (response.data?.integration) {
          setSelectedIntegration(response.data.integration);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Blad',
        description: error.response?.data?.message || 'Nie udalo sie zmienic statusu',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedIntegration || demoMode) {
      toast({ title: 'Tryb demo', description: 'Test niedostepny w trybie demo' });
      return;
    }

    setTesting(true);
    try {
      const response = await integrationsApi.testConnection(selectedIntegration.name);

      if (response.success && response.data?.result?.success) {
        toast({
          title: 'Polaczenie OK',
          description: response.data.result.message || 'Test polaczenia zakonczony sukcesem',
        });
      } else {
        toast({
          title: 'Blad polaczenia',
          description: response.data?.result?.message || 'Test polaczenia nie powiodl sie',
          variant: 'destructive',
        });
      }
      await loadLogs(selectedIntegration.name);
    } catch (error: any) {
      toast({
        title: 'Blad',
        description: error.response?.data?.message || 'Nie udalo sie przetestowac polaczenia',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const toggleCredentialVisibility = (key: string) => {
    setShowCredentials(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getCredentialFields = (provider: string): { key: string; label: string; type: string }[] => {
    switch (provider) {
      case 'wfirma':
        return [
          { key: 'access_key', label: 'Access Key', type: 'password' },
          { key: 'secret_key', label: 'Secret Key', type: 'password' },
          { key: 'company_id', label: 'Company ID', type: 'text' },
        ];
      case 'apaczka':
        return [
          { key: 'app_id', label: 'App ID', type: 'text' },
          { key: 'app_secret', label: 'App Secret', type: 'password' },
        ];
      case 'baselinker':
        return [
          { key: 'api_token', label: 'API Token', type: 'password' },
        ];
      case 'allegro':
        return [
          { key: 'client_id', label: 'Client ID', type: 'text' },
          { key: 'client_secret', label: 'Client Secret', type: 'password' },
        ];
      default:
        return [];
    }
  };

  const getConfigFields = (provider: string): { key: string; label: string; type: string }[] => {
    switch (provider) {
      case 'wfirma':
        return [
          { key: 'api_url', label: 'URL API', type: 'text' },
          { key: 'default_payment_method', label: 'Domyslna metoda platnosci', type: 'text' },
          { key: 'default_series', label: 'Seria faktur', type: 'text' },
        ];
      case 'apaczka':
        return [
          { key: 'api_url', label: 'URL API', type: 'text' },
          { key: 'default_service', label: 'Domyslny serwis', type: 'text' },
        ];
      default:
        return [{ key: 'api_url', label: 'URL API', type: 'text' }];
    }
  };

  const ProviderIcon = selectedIntegration ? PROVIDER_ICONS[selectedIntegration.provider] || Plug : Plug;

  if (loading) {
    return (
      <div className="p-4 md:p-6 text-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-muted-foreground">Ladowanie integracji...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft size={18} />
        <span>Powrot do panelu</span>
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Plug size={28} />
            Integracje zewnetrzne
          </h1>
          <p className="text-sm text-muted-foreground">
            Zarzadzaj polaczeniami z zewnetrznymi systemami
          </p>
          {demoMode && (
            <p className="text-xs text-orange-600 mt-1">Tryb demo - zapis niedostepny</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista integracji */}
        <div className="lg:col-span-1">
          <div className="card-industrial">
            <h2 className="font-bold mb-4">Dostepne integracje</h2>
            <div className="space-y-2">
              {integrations.map(integration => {
                const Icon = PROVIDER_ICONS[integration.provider] || Plug;
                return (
                  <button
                    key={integration.id}
                    onClick={() => selectIntegration(integration)}
                    className={`w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3 ${
                      selectedIntegration?.id === integration.id
                        ? 'bg-primary/10 border border-primary'
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <Icon size={24} className={integration.is_enabled ? 'text-green-600' : 'text-muted-foreground'} />
                    <div className="flex-1">
                      <p className="font-medium">{integration.display_name}</p>
                      <p className="text-xs text-muted-foreground">{integration.description}</p>
                    </div>
                    {integration.is_enabled ? (
                      <CheckCircle size={18} className="text-green-600" />
                    ) : (
                      <XCircle size={18} className="text-muted-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Szczegoly integracji */}
        <div className="lg:col-span-2">
          {selectedIntegration ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="card-industrial">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <ProviderIcon size={32} className={selectedIntegration.is_enabled ? 'text-green-600' : 'text-muted-foreground'} />
                    <div>
                      <h2 className="text-xl font-bold">{selectedIntegration.display_name}</h2>
                      <p className="text-sm text-muted-foreground">{selectedIntegration.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleEnabled}
                    disabled={saving}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedIntegration.is_enabled
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {selectedIntegration.is_enabled ? 'Wylacz' : 'Wlacz'}
                  </button>
                </div>

                {selectedIntegration.last_error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 mb-4">
                    <AlertCircle size={18} className="text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Ostatni blad</p>
                      <p className="text-xs text-red-600">{selectedIntegration.last_error}</p>
                    </div>
                  </div>
                )}

                {selectedIntegration.last_sync_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={14} />
                    <span>Ostatnia synchronizacja: {new Date(selectedIntegration.last_sync_at).toLocaleString('pl-PL')}</span>
                  </div>
                )}
              </div>

              {/* Credentials */}
              <div className="card-industrial">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Settings size={18} />
                  Dane dostepu (Credentials)
                </h3>
                <div className="space-y-3">
                  {getCredentialFields(selectedIntegration.provider).map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium mb-1">{field.label}</label>
                      <div className="relative">
                        <input
                          type={showCredentials[field.key] ? 'text' : field.type}
                          value={editedCredentials[field.key] || ''}
                          onChange={e => setEditedCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="input-industrial w-full pr-10"
                          placeholder={`Wprowadz ${field.label}`}
                        />
                        {field.type === 'password' && (
                          <button
                            type="button"
                            onClick={() => toggleCredentialVisibility(field.key)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showCredentials[field.key] ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Config */}
              <div className="card-industrial">
                <h3 className="font-bold mb-4">Konfiguracja</h3>
                <div className="space-y-3">
                  {getConfigFields(selectedIntegration.provider).map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium mb-1">{field.label}</label>
                      <input
                        type={field.type}
                        value={editedConfig[field.key] || ''}
                        onChange={e => setEditedConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="input-industrial w-full"
                        placeholder={field.label}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  <Save size={18} className="mr-2" />
                  {saving ? 'Zapisywanie...' : 'Zapisz konfiguracje'}
                </button>
                <button onClick={handleTestConnection} disabled={testing} className="btn-secondary">
                  <TestTube size={18} className="mr-2" />
                  {testing ? 'Testowanie...' : 'Testuj polaczenie'}
                </button>
              </div>

              {/* Logs */}
              {logs.length > 0 && (
                <div className="card-industrial">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <FileText size={18} />
                    Ostatnie operacje
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {logs.map(log => (
                      <div
                        key={log.id}
                        className={`p-2 rounded text-sm ${
                          log.status === 'success' ? 'bg-green-50' : log.status === 'error' ? 'bg-red-50' : 'bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{log.action}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString('pl-PL')}
                          </span>
                        </div>
                        {log.error_message && (
                          <p className="text-xs text-red-600 mt-1">{log.error_message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="card-industrial text-center py-12">
              <Plug size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Wybierz integracje z listy po lewej stronie</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPanel;
