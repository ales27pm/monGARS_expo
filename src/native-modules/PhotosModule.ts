import { NativeModules } from "react-native";

interface PhotoAlbum {
  title: string;
  assetCount: number;
}

interface PhotoAsset {
  uri: string;
  width: number;
  height: number;
  filename: string;
}

interface PhotosTurboModuleType {
  /**
   * Request permission to access photo library
   * @returns Promise with permission granted status
   */
  requestPermission(): Promise<{ granted: boolean }>;

  /**
   * Get all photo albums
   * @returns Promise with array of albums
   */
  getAlbums(): Promise<PhotoAlbum[]>;

  /**
   * Pick a photo from the library
   * @returns Promise with selected photo data
   */
  pickPhoto(): Promise<PhotoAsset>;

  /**
   * Save an image to the photo library
   * @param imagePath - Path to the image file
   * @returns Promise with success status
   */
  saveImage(imagePath: string): Promise<{ success: boolean }>;
}

const { PhotosTurboModule } = NativeModules;

export default PhotosTurboModule as PhotosTurboModuleType;
