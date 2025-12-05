import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type ColorTheme = 'blue' | 'green' | 'purple' | 'red';
export type TextSize = 'small' | 'medium' | 'large';

interface Settings {
  colorTheme: ColorTheme;
  textSize: TextSize;
  defaultName: string;
}

interface SettingsContextType {
  settings: Settings;
  updateColorTheme: (theme: ColorTheme) => void;
  updateTextSize: (size: TextSize) => void;
  updateDefaultName: (name: string) => void;
}

const defaultSettings: Settings = {
  colorTheme: 'blue',
  textSize: 'medium',
  defaultName: '',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('shanghaiRummySettings');
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('shanghaiRummySettings', JSON.stringify(settings));
  }, [settings]);

  const updateColorTheme = (theme: ColorTheme) => {
    setSettings(prev => ({ ...prev, colorTheme: theme }));
  };

  const updateTextSize = (size: TextSize) => {
    setSettings(prev => ({ ...prev, textSize: size }));
  };

  const updateDefaultName = (name: string) => {
    setSettings(prev => ({ ...prev, defaultName: name }));
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateColorTheme,
        updateTextSize,
        updateDefaultName,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
