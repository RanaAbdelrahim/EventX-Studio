/**
 * Checks if a string is a valid hex color
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Converts a hex color to an RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!isValidHexColor(hex)) {
    return null;
  }
  
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return { r, g, b };
}

/**
 * Applies CSS variables for theming
 */
export function applyTheme(settings: {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
}) {
  const { theme, primaryColor, accentColor, fontFamily } = settings;
  const root = document.documentElement;
  
  // Apply colors
  if (isValidHexColor(primaryColor)) {
    root.style.setProperty('--primary-color', primaryColor);
    
    // Generate lighter/darker variants
    const rgb = hexToRgb(primaryColor);
    if (rgb) {
      root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
  }
  
  if (isValidHexColor(accentColor)) {
    root.style.setProperty('--accent-color', accentColor);
    
    // Generate lighter/darker variants
    const rgb = hexToRgb(accentColor);
    if (rgb) {
      root.style.setProperty('--accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }
  }
  
  // Apply font family
  if (fontFamily) {
    root.style.setProperty('--font-family', fontFamily);
  }
  
  // Apply theme
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else {
    // System theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.setAttribute('data-theme', 'light');
    }
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (e.matches) {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.setAttribute('data-theme', 'light');
      }
    });
  }
}
