export interface PinSecurityConfig {
  isEnabled: boolean;
  pin: string;
  masterKey: string;
  hint: string;
  showHintOnLockScreen: boolean;
  autoLockMinutes: number; // 0 for disabled
  lastUnlockedAt?: number;
}

export const DEFAULT_PIN_SECURITY_CONFIG: PinSecurityConfig = {
  isEnabled: false, // User can enable and disable manually; default is false or user can turn it on
  pin: '0000',
  masterKey: '0000',
  hint: 'Default PIN is 0000',
  showHintOnLockScreen: true,
  autoLockMinutes: 0,
};
