const colors = require('tailwindcss/colors');
const defaultTheme = require('tailwindcss/defaultTheme');
const plugin = require('tailwindcss/plugin');

const SCREENS = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };

const previewScreens = plugin(({ addVariant }) => {
    for (const [name, width] of Object.entries(SCREENS)) {
        addVariant(name, [
            `@media (min-width: ${width}px) { :where(html:not([data-preview])) & }`,
            `:where(html[data-preview~="${name}"]) &`,
        ]);
    }

    for (const [name, width] of Object.entries(SCREENS).reverse()) {
        addVariant(`max-${name}`, [
            `@media not all and (min-width: ${width}px) { :where(html:not([data-preview])) & }`,
            `:where(html[data-preview]:not([data-preview~="${name}"])) &`,
        ]);
    }
});

const dz = (variable) => `rgb(from var(${variable}) r g b / <alpha-value>)`;

const legible = (variable) => {
    const channel = 'clamp(0, (186 - (0.299 * r + 0.587 * g + 0.114 * b)) * 255, 255)';

    return `rgb(from var(${variable}) ${channel} ${channel} ${channel} / <alpha-value>)`;
};

const gray = {
    50: dz('--ink'),
    100: dz('--ink'),
    200: dz('--ink'),
    300: dz('--ink-muted'),
    400: dz('--ink-muted'),
    500: dz('--ink-faint'),
    600: dz('--surface-overlay'),
    700: dz('--surface-raised'),
    800: dz('--surface-card'),
    900: dz('--surface-base'),
};

module.exports = {
    content: [
        './resources/scripts/**/*.{js,ts,tsx}',

        './resources/views/**/*.blade.php',
    ],
    corePlugins: {

        container: false,
    },
    theme: {
        screens: {},
        extend: {
            fontFamily: {
                header: ['"IBM Plex Sans"', '"Roboto"', 'system-ui', 'sans-serif'],

                sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
                display: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
                akira: ['var(--font-display)', ...defaultTheme.fontFamily.sans],
                
                minecraft: ['Minecraft', 'ui-monospace', 'monospace'],
                mono: ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
            },
            colors: {
                black: '#131a20',

                primary: colors.blue,
                gray: gray,
                neutral: gray,
                cyan: colors.cyan,

                base: dz('--surface-base'),
                card: dz('--surface-card'),
                raised: dz('--surface-raised'),
                overlay: dz('--surface-overlay'),

                line: {
                    DEFAULT: 'rgb(from var(--line-rgb) r g b / var(--line-alpha))',
                    field: 'rgb(from var(--line-rgb) r g b / var(--field-line-alpha))',
                    hair: 'rgb(from var(--line-rgb) r g b / 0.1)',
                },

                ink: {
                    DEFAULT: dz('--ink'),
                    muted: dz('--ink-muted'),
                    faint: dz('--ink-faint'),
                    inverse: dz('--ink-inverse'),
                },

                accent: {
                    DEFAULT: dz('--accent'),
                    alt: dz('--accent-alt'),
                    glow: dz('--accent-glow'),
                    ink: legible('--accent'),
                },

                'card-active': dz('--card-active'),

                success: dz('--success'),
                offline: dz('--status-offline'),
                warning: dz('--warning'),
                danger: dz('--danger'),

                chart: {
                    1: dz('--chart-1'),
                    2: dz('--chart-2'),
                },

                hud: dz('--hud-surface'),
                terminal: {
                    ink: dz('--terminal-ink'),
                    muted: dz('--terminal-muted'),
                    accent: dz('--terminal-accent'),
                },

                promo: {
                    DEFAULT: dz('--promo'),
                    ink: dz('--promo-ink'),
                },

                btn: {
                    DEFAULT: dz('--btn'),
                    ink: dz('--btn-ink'),
                },
            },

            borderRadius: {
                lg: 'var(--radius-lg, 0.5rem)',
                xl: 'var(--radius-xl, 0.75rem)',
                '2xl': 'var(--radius-2xl, 1rem)',
                '3xl': 'var(--radius-3xl, 1.5rem)',
            },
            boxShadow: {
                glow: '0 0 24px -6px rgb(from var(--accent) r g b / 0.45)',
                'glow-alt': '0 0 28px -6px rgb(from var(--accent-alt) r g b / 0.5)',
                panel: 'var(--shadow-panel)',
            },

            backgroundImage: {
                grid: 'linear-gradient(to right, rgb(from var(--line-rgb) r g b / 0.045) 1px, transparent 1px), linear-gradient(to bottom, rgb(from var(--line-rgb) r g b / 0.045) 1px, transparent 1px)',
            },
            backgroundSize: {
                grid: '44px 44px',
            },
            fontSize: {
                '2xs': '0.625rem',
            },
            transitionDuration: {
                250: '250ms',
            },
            borderColor: theme => ({
                default: theme('colors.neutral.400', 'currentColor'),
            }),
            keyframes: {
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(200%)' },
                },
                'text-shimmer': {
                    '0%': { backgroundPosition: '160% 50%' },
                    '100%': { backgroundPosition: '-60% 50%' },
                },
                'nudge-x': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '50%': { transform: 'translateX(3px)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-14px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { opacity: '0.45' },
                    '50%': { opacity: '0.9' },
                },
                'scroll-y': {
                    '0%': { transform: 'translateY(0)' },
                    '100%': { transform: 'translateY(-50%)' },
                },
                'toast-in': {
                    '0%': { opacity: '0', transform: 'translateX(1.25rem) scale(0.97)' },
                    '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
                },
                rise: {
                    '0%': { opacity: '0', transform: 'translateY(0.75rem)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                glint: {
                    '0%': { transform: 'translateX(-120%) skewX(-20deg)' },
                    '100%': { transform: 'translateX(220%) skewX(-20deg)' },
                },
                enchant: {
                    from: { backgroundPosition: '-256px 1024px' },
                    to: { backgroundPosition: '256px -1024px' },
                },
                pop: {
                    '0%': { opacity: '0', transform: 'scale(0.94)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },

                'toast-glow': {
                    '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
                    '33%': { transform: 'translate3d(-10%, -18%, 0) scale(1.08)' },
                    '66%': { transform: 'translate3d(-22%, 4%, 0) scale(0.96)' },
                },

                'modal-in': {
                    '0%': { opacity: '0', transform: 'translateY(0.5rem) scale(0.985)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                'backdrop-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'flash-life': {
                    '0%': { transform: 'scaleX(1)' },
                    '100%': { transform: 'scaleX(0)' },
                },
                'panel-in': {
                    '0%': { opacity: '0', transform: 'translateY(1.25rem) scale(0.96)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
            },
            animation: {
                shimmer: 'shimmer 1.8s infinite',
                'text-shimmer': 'text-shimmer 2.4s linear infinite',
                'nudge-x': 'nudge-x 1.4s ease-in-out infinite',
                float: 'float 7s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
                'scroll-y': 'scroll-y 48s linear infinite',
                'toast-in': 'toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1)',
                rise: 'rise 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                pop: 'pop 140ms cubic-bezier(0.16, 1, 0.3, 1)',
                glint: 'glint 4.5s ease-in-out infinite',
                enchant: 'enchant 32s linear infinite',
                'flash-life': 'flash-life 8s linear forwards',
                'modal-in': 'modal-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                'backdrop-in': 'backdrop-in 200ms ease-out',
                'toast-glow': 'toast-glow 9s ease-in-out infinite',
                'panel-in': 'panel-in 260ms cubic-bezier(0.16, 1, 0.3, 1)',
            },
        },
    },
    plugins: [
        previewScreens,
        require('@tailwindcss/line-clamp'),
        require('@tailwindcss/forms')({
            strategy: 'class',
        }),
    ]
};
