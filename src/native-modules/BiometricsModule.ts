import { NativeModules } from "react-native";

interface BiometricsTurboModuleType {
  /**
   * Check if biometric authentication is available
   * @returns Promise with availability and biometry type (faceID, touchID)
   */
  isAvailable(): Promise<{ available: boolean; biometryType: string }>;

  /**
   * Authenticate using Face ID or Touch ID
   * @param reason - Reason shown to the user
   * @returns Promise with authentication success status
   */
  authenticate(reason: string): Promise<{ success: boolean }>;
}

const { BiometricsTurboModule } = NativeModules;

export default BiometricsTurboModule as BiometricsTurboModuleType;
