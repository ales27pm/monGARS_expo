import { NativeModules } from "react-native";

interface MailComposerTurboModuleType {
  /**
   * Check if email can be sent on the device
   * @returns Promise with availability status
   */
  canSendMail(): Promise<{ available: boolean }>;

  /**
   * Compose and send an email
   * Opens native mail composer
   * @param options - Email composition options
   * @returns Promise with success status
   */
  composeMail(options: {
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body?: string;
    isHTML?: boolean;
  }): Promise<{ success: boolean }>;
}

const { MailComposerTurboModule } = NativeModules;

export default MailComposerTurboModule as MailComposerTurboModuleType;
