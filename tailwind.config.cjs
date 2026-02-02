module.exports = {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx,html}'
    ],
    theme: {
        extend: {
            // Material Design 3 Color System
            colors: {
                'md3-primary': '#6750A4',
                'md3-on-primary': '#FFFFFF',
                'md3-primary-container': '#EADDFF',
                'md3-on-primary-container': '#21005E',

                'md3-secondary': '#625B71',
                'md3-on-secondary': '#FFFFFF',
                'md3-secondary-container': '#E8DEF8',
                'md3-on-secondary-container': '#1E192B',

                'md3-tertiary': '#7D5260',
                'md3-on-tertiary': '#FFFFFF',
                'md3-tertiary-container': '#FFD8E4',
                'md3-on-tertiary-container': '#370B1E',

                'md3-error': '#B3261E',
                'md3-on-error': '#FFFFFF',
                'md3-error-container': '#F9DEDC',
                'md3-on-error-container': '#410E0B',

                'md3-surface': '#FFFBFE',
                'md3-on-surface': '#1C1B1F',
                'md3-surface-variant': '#E7E0EC',
                'md3-on-surface-variant': '#49454E',
                'md3-outline': '#79747E',
                'md3-outline-variant': '#CAC4D0',

                'md3-background': '#FFFBFE',
                'md3-on-background': '#1C1B1F',

                'md3-surface-1': '#F6F2FA',
                'md3-surface-2': '#F2EDF7',
                'md3-surface-3': '#EEE9F4',
                'md3-surface-4': '#EDE8F3',
                'md3-surface-5': '#EAE5F0',
            },
            fontFamily: {
                'roboto': ['Roboto', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'md3-1': '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15)',
                'md3-2': '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15)',
                'md3-3': '0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.3)',
                'md3-4': '0 6px 10px 4px rgba(0, 0, 0, 0.15), 0 2px 3px rgba(0, 0, 0, 0.3)',
                'md3-5': '0 8px 12px 6px rgba(0, 0, 0, 0.15), 0 4px 4px rgba(0, 0, 0, 0.3)',
            },
            borderRadius: {
                'md3-none': '0',
                'md3-xs': '4px',
                'md3-sm': '8px',
                'md3-md': '12px',
                'md3-lg': '16px',
                'md3-xl': '28px',
                'md3-full': '9999px',
            }
        },
    },
    plugins: [],
};
