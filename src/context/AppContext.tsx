import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Settings } from '../types';

interface AppContextType {
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const defaultSettings: Settings = {
  default_session_duration: 50,
  default_session_value: 200,
  google_calendar_connected: false,
  clinic_name: 'Clínica de Psicanálise',
  analyst_name: 'Aline Herts',
  analyst_crp: '',
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
      try { setSettings({ ...defaultSettings, ...JSON.parse(saved) }); } catch {}
    }
  }, []);

  const updateSettings = (s: Partial<Settings>) => {
    const updated = { ...settings, ...s };
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
