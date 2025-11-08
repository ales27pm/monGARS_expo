import { NativeModules } from "react-native";

interface MessagesTurboModuleType {
  /**
   * Send an SMS message
   * Opens the native SMS composer with pre-filled recipient and body
   * @param phoneNumber - Recipient phone number
   * @param message - Message body text
   * @returns Promise with success status
   */
  sendMessage(phoneNumber: string, message: string): Promise<{ success: boolean }>;

  /**
   * Check if messaging is available on the device
   * @returns Promise with availability status
   */
  canSendMessages(): Promise<{ available: boolean }>;
}

const { MessagesTurboModule } = NativeModules;

export default MessagesTurboModule as MessagesTurboModuleType;
