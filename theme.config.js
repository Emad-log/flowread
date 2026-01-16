/** @type {const} */
const themeColors = {
  // Extreme minimalism: pure white/grey palette
  primary: { light: '#000000', dark: '#FFFFFF' },      // Black on light, white on dark
  accent: { light: '#666666', dark: '#999999' },       // Subtle grey accent
  background: { light: '#FFFFFF', dark: '#000000' },   // Pure white / pure black
  surface: { light: '#F5F5F5', dark: '#111111' },      // Very subtle grey
  foreground: { light: '#000000', dark: '#FFFFFF' },   // Pure black / pure white text
  muted: { light: '#888888', dark: '#777777' },        // Medium grey
  border: { light: '#E0E0E0', dark: '#222222' },       // Subtle borders
  success: { light: '#000000', dark: '#FFFFFF' },      // Keep minimal
  warning: { light: '#666666', dark: '#999999' },      // Grey for warnings
  error: { light: '#333333', dark: '#CCCCCC' },        // Dark grey for errors
};

module.exports = { themeColors };
