import { NativeModules, NativeEventEmitter } from "react-native";

interface LocationCoordinates {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  speed: number;
  heading: number;
}

interface LocationTurboModuleType {
  /**
   * Request location permissions
   * @returns Promise with permission granted status
   */
  requestPermission(): Promise<{ granted: boolean }>;

  /**
   * Get current location once
   * @returns Promise with current location coordinates
   */
  getCurrentLocation(): Promise<LocationCoordinates>;

  /**
   * Start continuous location updates
   * Listen to "locationUpdate" events via NativeEventEmitter
   * @returns Promise with success status
   */
  startLocationUpdates(): Promise<{ success: boolean }>;

  /**
   * Stop continuous location updates
   * @returns Promise with success status
   */
  stopLocationUpdates(): Promise<{ success: boolean }>;
}

const { LocationTurboModule } = NativeModules;

// Export event emitter for location updates
export const LocationEventEmitter = new NativeEventEmitter(LocationTurboModule);

export default LocationTurboModule as LocationTurboModuleType;
