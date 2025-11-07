import { NativeModules } from "react-native";

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string;
  timeout?: number; // milliseconds
}

interface FetchResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  url: string;
}

interface ScrapeOptions {
  // Future options for scraping behavior
  timeout?: number;
  waitForLoad?: boolean;
}

interface LinkData {
  href: string;
  text: string;
}

interface ImageData {
  src: string;
  alt: string;
}

interface ScrapeResult {
  html: string;
  title: string;
  description: string;
  links: LinkData[];
  images: ImageData[];
  text: string;
  url: string;
}

interface ExecuteScriptResult {
  result: any;
}

interface DownloadResult {
  path: string;
  size: number;
  mimeType: string;
  status: number;
}

interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
}

interface CookieInput {
  name: string;
  value: string;
  domain: string;
  path?: string;
  secure?: boolean;
}

interface WebTurboModuleType {
  /**
   * Fetch data from a URL using native URLSession
   * @param url - URL to fetch
   * @param options - Fetch options (method, headers, body, timeout)
   * @returns Promise with response data
   */
  fetch(url: string, options?: FetchOptions): Promise<FetchResponse>;

  /**
   * Scrape a webpage and extract HTML, links, images, and text
   * Uses WKWebView to render JavaScript and extract content
   * @param url - URL to scrape
   * @param options - Scraping options
   * @returns Promise with scraped data
   */
  scrapeWebpage(url: string, options?: ScrapeOptions): Promise<ScrapeResult>;

  /**
   * Load a webpage and execute custom JavaScript on it
   * @param url - URL to load
   * @param script - JavaScript code to execute
   * @returns Promise with script execution result
   */
  executeScript(url: string, script: string): Promise<ExecuteScriptResult>;

  /**
   * Perform a Google search and scrape results
   * @param query - Search query
   * @returns Promise with search results page data
   */
  searchGoogle(query: string): Promise<ScrapeResult>;

  /**
   * Download a file from URL to local filesystem
   * @param url - File URL to download
   * @param destination - Local file path to save to
   * @returns Promise with download info
   */
  downloadFile(url: string, destination: string): Promise<DownloadResult>;

  /**
   * Get cookies for a specific domain
   * @param url - URL to get cookies for
   * @returns Promise with array of cookies
   */
  getCookies(url: string): Promise<Cookie[]>;

  /**
   * Set a cookie for a domain
   * @param cookie - Cookie data to set
   * @returns Promise with success status
   */
  setCookie(cookie: CookieInput): Promise<{ success: boolean }>;

  /**
   * Clear all web cache, cookies, and storage
   * @returns Promise with clear status
   */
  clearCache(): Promise<{ cleared: boolean }>;
}

const { WebTurboModule } = NativeModules;

export default WebTurboModule as WebTurboModuleType;
