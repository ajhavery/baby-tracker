import { Platform } from 'react-native';

// On web PWA (added to home screen), the app runs fullscreen behind the status bar.
// We use CSS env(safe-area-inset-top) via the HTML, so we only need a small padding here.
// On native, we need 60px to clear the status bar + notch.
export const HEADER_TOP_PADDING = Platform.OS === 'web' ? 20 : 60;
