import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ÚNICA FUENTE DE VERDAD PARA TODOS LOS COLORES
        // Colores base del tema oscuro
        background: "rgb(24 24 27)", // zinc-900 - Fondo sólido
        foreground: "rgb(255 255 255)", // white

        // Colores de componentes
        card: {
          DEFAULT: "rgb(24 24 27)", // zinc-900 - Cards más claras
          foreground: "rgb(255 255 255)", // white
        },
        popover: {
          DEFAULT: "rgb(9 9 11)", // zinc-950 - Fondo más oscuro para modales
          foreground: "rgb(255 255 255)", // white
        },
        primary: {
          DEFAULT: "rgb(255 255 255)", // white
          foreground: "rgb(9 9 11)", // zinc-950
        },
        secondary: {
          DEFAULT: "rgb(39 39 42)", // zinc-800
          foreground: "rgb(255 255 255)", // white
        },
        muted: {
          DEFAULT: "rgb(39 39 42)", // zinc-800
          foreground: "rgb(161 161 170)", // zinc-400
        },
        accent: {
          DEFAULT: "rgb(39 39 42)", // zinc-800
          foreground: "rgb(255 255 255)", // white
        },
        destructive: {
          DEFAULT: "rgb(239 68 68)", // red-500
          foreground: "rgb(255 255 255)", // white
        },

        // Colores de bordes y elementos
        border: "rgb(39 39 42)", // zinc-800 - Bordes consistentes
        input: "rgb(39 39 42)", // zinc-800
        ring: "rgb(228 228 231)", // zinc-200

        // Colores para gráficos
        chart: {
          1: "rgb(59 130 246)", // blue-500
          2: "rgb(16 185 129)", // emerald-500
          3: "rgb(245 158 11)", // amber-500
          4: "rgb(168 85 247)", // purple-500
          5: "rgb(236 72 153)", // pink-500
        },

        // Colores específicos para sidebar
        sidebar: {
          DEFAULT: "rgb(9 9 11)", // zinc-950 - Fondo más oscuro
          foreground: "rgb(244 244 245)", // zinc-100
          primary: "rgb(255 255 255)", // white
          "primary-foreground": "rgb(9 9 11)", // zinc-950
          accent: "rgb(39 39 42)", // zinc-800
          "accent-foreground": "rgb(244 244 245)", // zinc-100
          border: "rgb(39 39 42)", // zinc-800
          ring: "rgb(228 228 231)", // zinc-200
        },
      },
      borderRadius: {
        lg: "0.625rem",
        md: "calc(0.625rem - 2px)",
        sm: "calc(0.625rem - 4px)",
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
