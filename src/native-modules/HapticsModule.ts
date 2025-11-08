import { NativeModules } from "react-native";

type HapticStyle = "light" | "medium" | "heavy" | "soft" | "rigid";
type NotificationType = "success" | "warning" | "error";

interface HapticsTurboModuleType {
  /**
   * Trigger impact haptic feedback
   * @param style - Impact style (light, medium, heavy, soft, rigid)
   * @returns Promise with success status
   */
  impact(style: HapticStyle): Promise<{ success: boolean }>;

  /**
   * Trigger notification haptic feedback
   * @param type - Notification type (success, warning, error)
   * @returns Promise with success status
   */
  notification(type: NotificationType): Promise<{ success: boolean }>;

  /**
   * Trigger selection haptic feedback
   * @returns Promise with success status
   */
  selection(): Promise<{ success: boolean }>;
}

const { HapticsTurboModule } = NativeModules;

export default HapticsTurboModule as HapticsTurboModuleType;
