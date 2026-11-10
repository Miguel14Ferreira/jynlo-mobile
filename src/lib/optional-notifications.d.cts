import type * as Notifications from 'expo-notifications';

/**
 * Optional native bridge: returns null when Expo notifications is unavailable.
 * Importing this declaration never loads the native module at runtime.
 */
export function getNativeNotifications(): typeof Notifications | null;
