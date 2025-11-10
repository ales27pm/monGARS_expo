# WebTurboModule - Native iOS Web Capabilities

## Overview

The WebTurboModule provides comprehensive web scraping, fetching, and manipulation capabilities using native iOS frameworks (URLSession and WKWebView).

---

## Features

✅ **HTTP Fetch** - Native URLSession for HTTP requests
✅ **Web Scraping** - Extract HTML, links, images, and text
✅ **JavaScript Execution** - Run custom JS on webpages
✅ **Google Search** - Helper for searching Google
✅ **File Downloads** - Download files to local filesystem
✅ **Cookie Management** - Get and set cookies
✅ **Cache Control** - Clear web cache and storage

---

## Installation

The module is already implemented in:
- Native: `/ios/MonGARS/NativeModules/WebTurboModule.mm`
- TypeScript: `/src/native-modules/WebModule.ts`

---

## Usage Examples

### 1. Basic HTTP Fetch

```typescript
import { WebModule } from "@/native-modules";

// Simple GET request
const response = await WebModule.fetch("https://api.example.com/data");
console.log(response.status); // 200
console.log(response.body);   // Response data

// POST request with headers
const postResponse = await WebModule.fetch("https://api.example.com/submit", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer token123"
  },
  body: JSON.stringify({ key: "value" }),
  timeout: 10000 // 10 seconds
});
```

### 2. Web Scraping

```typescript
// Scrape a webpage
const result = await WebModule.scrapeWebpage("https://example.com");

console.log(result.title);       // Page title
console.log(result.description); // Meta description
console.log(result.html);        // Full HTML
console.log(result.text);        // Plain text content

// Extract all links
result.links.forEach(link => {
  console.log(`${link.text}: ${link.href}`);
});

// Extract all images
result.images.forEach(img => {
  console.log(`${img.alt}: ${img.src}`);
});
```

### 3. Execute JavaScript on Page

```typescript
// Extract specific data using JavaScript
const result = await WebModule.executeScript(
  "https://example.com",
  `
  // Get all product prices
  const prices = Array.from(document.querySelectorAll('.price'))
    .map(el => el.textContent);

  // Return as JSON
  JSON.stringify(prices);
  `
);

const prices = JSON.parse(result.result);
console.log(prices);
```

### 4. Google Search

```typescript
// Search Google and get results
const searchResults = await WebModule.searchGoogle("React Native");

console.log(searchResults.title);
console.log(searchResults.links); // Array of search result links
```

### 5. Download Files

```typescript
import { FileSystem } from "expo-file-system";

// Download an image
const downloadResult = await WebModule.downloadFile(
  "https://example.com/image.jpg",
  `${FileSystem.documentDirectory}image.jpg`
);

console.log(`Downloaded ${downloadResult.size} bytes`);
console.log(`MIME type: ${downloadResult.mimeType}`);
console.log(`Saved to: ${downloadResult.path}`);
```

### 6. Cookie Management

```typescript
// Get cookies for a domain
const cookies = await WebModule.getCookies("https://example.com");
cookies.forEach(cookie => {
  console.log(`${cookie.name} = ${cookie.value}`);
});

// Set a cookie
await WebModule.setCookie({
  name: "session_id",
  value: "abc123",
  domain: ".example.com",
  path: "/",
  secure: true
});
```

### 7. Clear Cache

```typescript
// Clear all web data
await WebModule.clearCache();
console.log("Cache cleared!");
```

---

## Advanced Use Cases

### Scrape Product Information

```typescript
const result = await WebModule.scrapeWebpage("https://shop.example.com/product");

// Extract product details using JavaScript
const productData = await WebModule.executeScript(
  "https://shop.example.com/product",
  `
  ({
    title: document.querySelector('h1.product-title').textContent,
    price: document.querySelector('.price').textContent,
    description: document.querySelector('.description').textContent,
    images: Array.from(document.querySelectorAll('.gallery img'))
      .map(img => img.src),
    inStock: document.querySelector('.stock-status').textContent.includes('In Stock')
  })
  `
);

console.log(productData.result);
```

### Monitor API Endpoint

```typescript
const checkAPI = async () => {
  try {
    const response = await WebModule.fetch("https://api.example.com/health", {
      timeout: 5000
    });

    if (response.status === 200) {
      console.log("API is healthy");
    } else {
      console.log(`API returned: ${response.status}`);
    }
  } catch (error) {
    console.error("API is down:", error);
  }
};

// Check every 30 seconds
setInterval(checkAPI, 30000);
```

### Download Multiple Files

```typescript
const urls = [
  "https://example.com/file1.pdf",
  "https://example.com/file2.pdf",
  "https://example.com/file3.pdf"
];

const downloads = await Promise.all(
  urls.map((url, index) =>
    WebModule.downloadFile(
      url,
      `${FileSystem.documentDirectory}file${index + 1}.pdf`
    )
  )
);

console.log(`Downloaded ${downloads.length} files`);
downloads.forEach(d => console.log(`${d.path}: ${d.size} bytes`));
```

### Extract Article Content

```typescript
const article = await WebModule.executeScript(
  "https://blog.example.com/article",
  `
  ({
    title: document.querySelector('article h1').textContent,
    author: document.querySelector('.author').textContent,
    date: document.querySelector('.publish-date').textContent,
    content: document.querySelector('article .content').innerText,
    readTime: document.querySelector('.read-time').textContent,
    tags: Array.from(document.querySelectorAll('.tag')).map(t => t.textContent)
  })
  `
);

console.log(article.result);
```

### Search with Pagination

```typescript
const searchWithPages = async (query: string, pages: number) => {
  const results = [];

  for (let page = 0; page < pages; page++) {
    const url = `https://example.com/search?q=${encodeURIComponent(query)}&page=${page}`;
    const pageData = await WebModule.scrapeWebpage(url);
    results.push(...pageData.links);
  }

  return results;
};

const allResults = await searchWithPages("React Native", 3);
console.log(`Found ${allResults.length} total results`);
```

---

## iOS Frameworks Used

- **URLSession** - Native HTTP requests and file downloads
- **WKWebView** - JavaScript-enabled web scraping
- **WKHTTPCookieStore** - Cookie management
- **WKWebsiteDataStore** - Cache and storage management

---

## Performance Considerations

### Fetch vs Scrape

**Use `fetch` when:**
- Calling APIs
- Downloading files
- Simple HTTP requests
- No JavaScript needed

**Use `scrapeWebpage` when:**
- Extracting data from HTML
- Page uses JavaScript rendering
- Need to execute JS on page
- Want structured data extraction

### Memory Management

- WKWebView is reused across scraping calls
- Large HTML responses are handled efficiently
- Downloaded files stream directly to disk
- Cache can be cleared to free memory

### Timeouts

```typescript
// Set custom timeout for slow endpoints
await WebModule.fetch(url, { timeout: 60000 }); // 60 seconds
```

---

## Error Handling

```typescript
try {
  const response = await WebModule.fetch(url);
  // Handle success
} catch (error) {
  if (error.code === "INVALID_URL") {
    console.error("Invalid URL format");
  } else if (error.code === "FETCH_ERROR") {
    console.error("Network error:", error.message);
  } else if (error.code === "TIMEOUT") {
    console.error("Request timed out");
  }
}
```

Common error codes:
- `INVALID_URL` - Malformed URL
- `FETCH_ERROR` - Network or HTTP error
- `SCRAPE_ERROR` - Web scraping failed
- `NAVIGATION_ERROR` - Page failed to load
- `SCRIPT_ERROR` - JavaScript execution failed
- `DOWNLOAD_ERROR` - File download failed
- `MOVE_ERROR` - Could not save downloaded file

---

## Security & Privacy

### User Agent

The module uses iOS's default WebKit user agent. To customize:

```typescript
// Note: Would require module enhancement
// Current implementation uses default UA
```

### HTTPS

- Supports HTTPS with standard certificate validation
- HTTP requests work but may trigger App Transport Security warnings

### Cookies & Privacy

- Cookies are isolated to WKWebView instance
- Can be cleared with `clearCache()`
- No cross-domain cookie sharing (security feature)

---

## Limitations

1. **JavaScript Execution Timeout**: Scripts must complete within reasonable time
2. **Memory**: Very large pages may cause memory pressure
3. **Rate Limiting**: Respect target site's rate limits
4. **robots.txt**: Honor website scraping policies
5. **Legal**: Ensure compliance with website terms of service

---

## Best Practices

### 1. Add Error Handling

```typescript
const safeFetch = async (url: string) => {
  try {
    return await WebModule.fetch(url);
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return null;
  }
};
```

### 2. Use Timeouts

```typescript
// Always set reasonable timeouts
const response = await WebModule.fetch(url, {
  timeout: 10000 // 10 seconds max
});
```

### 3. Clean Up

```typescript
// Clear cache periodically
useEffect(() => {
  return () => {
    WebModule.clearCache();
  };
}, []);
```

### 4. Respect Rate Limits

```typescript
// Add delays between requests
await WebModule.fetch(url1);
await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
await WebModule.fetch(url2);
```

---

## Real-World Examples

### News Aggregator

```typescript
const getNewsHeadlines = async () => {
  const result = await WebModule.scrapeWebpage("https://news.example.com");

  const headlines = await WebModule.executeScript(
    "https://news.example.com",
    `
    Array.from(document.querySelectorAll('.headline')).map(h => ({
      title: h.textContent,
      link: h.querySelector('a').href,
      time: h.querySelector('.timestamp').textContent
    }))
    `
  );

  return headlines.result;
};
```

### Price Tracker

```typescript
const trackPrice = async (productUrl: string) => {
  const priceData = await WebModule.executeScript(
    productUrl,
    `({
      price: parseFloat(document.querySelector('.price').textContent.replace('$', '')),
      availability: document.querySelector('.stock').textContent,
      timestamp: new Date().toISOString()
    })`
  );

  return priceData.result;
};
```

### Image Downloader

```typescript
const downloadAllImages = async (url: string) => {
  const page = await WebModule.scrapeWebpage(url);

  const downloads = await Promise.all(
    page.images.slice(0, 10).map((img, i) =>
      WebModule.downloadFile(
        img.src,
        `${FileSystem.documentDirectory}image_${i}.jpg`
      )
    )
  );

  return downloads;
};
```

---

## Status

✅ **Implementation**: Complete
✅ **TypeScript**: Full type safety
✅ **Documentation**: Comprehensive
✅ **iOS Frameworks**: URLSession + WKWebView
✅ **Ready**: For production use!

---

## Module Count Update

**Total Native Modules: 20** (was 19, now includes WebTurboModule)

This powerful web module enables your app to:
- Fetch data from any API
- Scrape websites with JavaScript rendering
- Execute custom scripts on pages
- Download files efficiently
- Manage cookies and cache
- Search the web programmatically

Perfect for building news readers, price trackers, web scrapers, and more!
