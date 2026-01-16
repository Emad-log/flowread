/** @type {const} */
const themeColors = {
  // Extreme minimalism: pure white/grey palette
  primary: { light: '#000000', dark: '#FFFFFF' },      // Black on light, white on dark
  accent: { light: '#666666', dark: '#AAAAAA' },       // Subtle grey accent (brighter in dark)
  background: { light: '#FFFFFF', dark: '#000000' },   // Pure white / pure black
  surface: { light: '#F5F5F5', dark: '#1A1A1A' },      // Slightly brighter surface in dark
  foreground: { light: '#000000', dark: '#FFFFFF' },   // Pure black / pure white text
  muted: { light: '#888888', dark: '#999999' },        // Brighter muted text in dark mode
  border: { light: '#E0E0E0', dark: '#333333' },       // More visible borders in dark
  success: { light: '#000000', dark: '#FFFFFF' },      // Keep minimal
  warning: { light: '#666666', dark: '#BBBBBB' },      // Brighter in dark
  error: { light: '#333333', dark: '#DDDDDD' },        // Brighter in dark
};

module.exports = { themeColors };
