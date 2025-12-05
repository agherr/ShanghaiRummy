import { useSettings } from '../contexts/SettingsContext';

export function useTheme() {
  const { settings } = useSettings();

  const getThemeColors = () => {
    const themes = {
      blue: {
        bg: 'bg-blue-800',
        bgLight: 'bg-blue-700',
        bgLighter: 'bg-blue-600',
        text: 'text-blue-600',
        textLight: 'text-blue-500',
        border: 'border-blue-500',
        ring: 'ring-blue-500',
        hover: 'hover:bg-blue-700',
      },
      green: {
        bg: 'bg-green-800',
        bgLight: 'bg-green-700',
        bgLighter: 'bg-green-600',
        text: 'text-green-600',
        textLight: 'text-green-500',
        border: 'border-green-500',
        ring: 'ring-green-500',
        hover: 'hover:bg-green-700',
      },
      purple: {
        bg: 'bg-purple-800',
        bgLight: 'bg-purple-700',
        bgLighter: 'bg-purple-600',
        text: 'text-purple-600',
        textLight: 'text-purple-500',
        border: 'border-purple-500',
        ring: 'ring-purple-500',
        hover: 'hover:bg-purple-700',
      },
      red: {
        bg: 'bg-red-800',
        bgLight: 'bg-red-700',
        bgLighter: 'bg-red-600',
        text: 'text-red-600',
        textLight: 'text-red-500',
        border: 'border-red-500',
        ring: 'ring-red-500',
        hover: 'hover:bg-red-700',
      },
    };
    return themes[settings.colorTheme];
  };

  const getTextSize = () => {
    const sizes = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
    };
    return sizes[settings.textSize];
  };

  return { theme: getThemeColors(), textSize: getTextSize(), settings };
}
