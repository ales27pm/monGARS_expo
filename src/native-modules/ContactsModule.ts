import { NativeModules } from "react-native";

interface Contact {
  identifier: string;
  givenName: string;
  familyName: string;
  phoneNumbers: string[];
  emailAddresses: string[];
}

interface ContactsTurboModuleType {
  /**
   * Request permission to access contacts
   * @returns Promise with permission granted status
   */
  requestPermission(): Promise<{ granted: boolean }>;

  /**
   * Search contacts by name
   * @param query - Search query string
   * @returns Promise with array of matching contacts
   */
  searchContacts(query: string): Promise<Contact[]>;

  /**
   * Get all contacts
   * @returns Promise with array of all contacts
   */
  getAllContacts(): Promise<Contact[]>;

  /**
   * Get a specific contact by identifier
   * @param identifier - Contact identifier
   * @returns Promise with contact data
   */
  getContact(identifier: string): Promise<Contact>;

  /**
   * Add a new contact
   * @param contact - Contact data to add
   * @returns Promise with success status
   */
  addContact(contact: {
    givenName: string;
    familyName: string;
    phoneNumbers?: string[];
    emailAddresses?: string[];
  }): Promise<{ success: boolean; identifier: string }>;
}

const { ContactsTurboModule } = NativeModules;

export default ContactsTurboModule as ContactsTurboModuleType;
