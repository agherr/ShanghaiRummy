import { useNavigation } from '../contexts/NavigationContext';
import { useSettings } from '../contexts/SettingsContext';
import type { ColorTheme, TextSize } from '../contexts/SettingsContext';

function Settings() {
  const { goToLanding } = useNavigation();
  const { settings, updateColorTheme, updateTextSize, updateDefaultName } = useSettings();

  const themes: { value: ColorTheme; label: string; color: string }[] = [
    { value: 'blue', label: 'Ocean Blue', color: 'bg-blue-800' },
    { value: 'green', label: 'Forest Green', color: 'bg-green-800' },
    { value: 'purple', label: 'Royal Purple', color: 'bg-purple-800' },
    { value: 'red', label: 'Ruby Red', color: 'bg-red-800' },
  ];

  const textSizes: { value: TextSize; label: string }[] = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ];

  const getThemeColor = (theme: ColorTheme) => {
    const themeMap = {
      blue: 'bg-blue-800',
      green: 'bg-green-800',
      purple: 'bg-purple-800',
      red: 'bg-red-800',
    };
    return themeMap[theme];
  };

  return (
    <div className={`min-h-screen ${getThemeColor(settings.colorTheme)} flex items-center justify-center p-4`}>
      <div className='w-full max-w-2xl bg-white rounded-lg shadow-xl p-6 md:p-8'>
        {/* Header */}
        <div className='flex items-center justify-between mb-6'>
          <h1 className='text-3xl font-bold text-gray-800'>Settings</h1>
          <button
            onClick={goToLanding}
            className='text-gray-600 hover:text-gray-800 transition-colors'
            aria-label='Close settings'
          >
            <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>

        {/* Color Theme */}
        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-700 mb-3'>Color Theme</h2>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
            {themes.map((theme) => (
              <button
                key={theme.value}
                onClick={() => updateColorTheme(theme.value)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.colorTheme === theme.value
                    ? 'border-gray-800 shadow-lg'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className={`w-full h-16 ${theme.color} rounded mb-2`}></div>
                <p className='text-sm font-medium text-gray-700'>{theme.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Text Size */}
        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-700 mb-3'>Text Size</h2>
          <div className='grid grid-cols-3 gap-3'>
            {textSizes.map((size) => (
              <button
                key={size.value}
                onClick={() => updateTextSize(size.value)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  settings.textSize === size.value
                    ? 'border-gray-800 shadow-lg bg-gray-50'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <p
                  className={`font-medium text-gray-700 ${
                    size.value === 'small' ? 'text-sm' : size.value === 'medium' ? 'text-base' : 'text-lg'
                  }`}
                >
                  {size.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Default Name */}
        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-700 mb-3'>Default Name</h2>
          <p className='text-sm text-gray-600 mb-3'>
            Set a default name to use when joining lobbies. Leave empty for auto-generated names.
          </p>
          <input
            type='text'
            value={settings.defaultName}
            onChange={(e) => updateDefaultName(e.target.value)}
            placeholder='Enter your name...'
            maxLength={20}
            className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        {/* Back Button */}
        <button
          onClick={goToLanding}
          className='w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg shadow transition-colors'
        >
          Back to Main Menu
        </button>
      </div>
    </div>
  );
}

export default Settings;
