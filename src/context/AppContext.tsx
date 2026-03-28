import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Settings } from '../types';

interface AppContextType {
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

// Credenciais puxadas do .env (jamais ficam visíveis ao usuário final)
const ENV_CREDENTIALS = {
  mp_access_token: import.meta.env.VITE_MP_ACCESS_TOKEN || undefined,
  mp_public_key: import.meta.env.VITE_MP_PUBLIC_KEY || undefined,
  google_calendar_id: import.meta.env.VITE_GOOGLE_CALENDAR_ID || undefined,
};

const defaultSettings: Settings = {
  default_session_duration: 50,
  default_session_value: 200,
  google_calendar_connected: false,
  clinic_name: 'Clínica de Psicanálise',
  analyst_name: 'Aline Herts',
  analyst_crp: '',
  // Injeta credenciais do .env já nos padrões
  ...ENV_CREDENTIALS,
};

const AppContext = createContext<AppContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
  searchQuery: '',
  setSearchQuery: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('clinic_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Remove chaves com valor undefined/null do localStorage para que
        // as variáveis de ambiente sempre prevaleçam
        Object.keys(parsed).forEach(k => {
          if (parsed[k] === undefined || parsed[k] === null || parsed[k] === '') {
            delete parsed[k];
          }
        });
        setSettings({ ...defaultSettings, ...parsed, ...ENV_CREDENTIALS });
      } catch {}
    }
  }, []);

  const updateSettings = (s: Partial<Settings>) => {
    // Garante que as credenciais do .env não sejam sobrescritas ao salvar
    const updated = { ...settings, ...s, ...ENV_CREDENTIALS };
    setSettings(updated);
    localStorage.setItem('clinic_settings', JSON.stringify(updated));
  };

  return (
    <AppContext.Provider value={{ settings, updateSettings, searchQuery, setSearchQuery }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
