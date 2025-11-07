import { NativeModules } from "react-native";

interface CalendarEvent {
  success: boolean;
  eventId: string;
}

interface CalendarTurboModuleType {
  createEvent(
    title: string,
    startDate: string, // ISO 8601 format
    endDate?: string, // ISO 8601 format (optional)
    durationSeconds?: number, // If no endDate, calculate from duration
    location?: string,
    notes?: string
  ): Promise<CalendarEvent>;
}

const { CalendarTurboModule } = NativeModules;

export default CalendarTurboModule as CalendarTurboModuleType;
