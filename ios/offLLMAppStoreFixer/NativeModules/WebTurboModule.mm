#import <React/RCTBridgeModule.h>
#import <WebKit/WebKit.h>

@interface WebTurboModule : NSObject <RCTBridgeModule, WKNavigationDelegate>
@property(nonatomic, strong) WKWebView *webView;
@property(nonatomic, copy) RCTPromiseResolveBlock resolve;
@property(nonatomic, copy) RCTPromiseRejectBlock reject;
@property(nonatomic, strong) NSMutableData *responseData;
@end

@implementation WebTurboModule

RCT_EXPORT_MODULE();

- (instancetype)init {
  if (self = [super init]) {
    dispatch_async(dispatch_get_main_queue(), ^{
      WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
      self.webView = [[WKWebView alloc] initWithFrame:CGRectZero configuration:config];
      self.webView.navigationDelegate = self;
    });
  }
  return self;
}

#pragma mark - HTTP Fetch

RCT_EXPORT_METHOD(fetch:(NSString *)urlString
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *url = [NSURL URLWithString:urlString];
  if (!url) {
    reject(@"INVALID_URL", @"Invalid URL provided", nil);
    return;
  }

  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];

  // Set HTTP method
  NSString *method = options[@"method"] ?: @"GET";
  request.HTTPMethod = method;

  // Set headers
  NSDictionary *headers = options[@"headers"];
  if (headers) {
    [headers enumerateKeysAndObjectsUsingBlock:^(NSString *key, NSString *value, BOOL *stop) {
      [request setValue:value forHTTPHeaderField:key];
    }];
  }

  // Set body for POST/PUT
  NSString *body = options[@"body"];
  if (body) {
    request.HTTPBody = [body dataUsingEncoding:NSUTF8StringEncoding];
  }

  // Set timeout
  NSNumber *timeout = options[@"timeout"];
  if (timeout) {
    request.timeoutInterval = [timeout doubleValue] / 1000.0; // Convert ms to seconds
  } else {
    request.timeoutInterval = 30.0; // Default 30 seconds
  }

  NSURLSessionConfiguration *config = [NSURLSessionConfiguration defaultSessionConfiguration];
  NSURLSession *session = [NSURLSession sessionWithConfiguration:config];

  NSURLSessionDataTask *task = [session dataTaskWithRequest:request completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
    if (error) {
      reject(@"FETCH_ERROR", error.localizedDescription, error);
      return;
    }

    NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
    NSString *responseText = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];

    resolve(@{
      @"status": @(httpResponse.statusCode),
      @"statusText": [NSHTTPURLResponse localizedStringForStatusCode:httpResponse.statusCode],
      @"headers": httpResponse.allHeaderFields ?: @{},
      @"body": responseText ?: @"",
      @"url": httpResponse.URL.absoluteString ?: @""
    });
  }];

  [task resume];
}

#pragma mark - Web Scraping with WKWebView

RCT_EXPORT_METHOD(scrapeWebpage:(NSString *)urlString
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *url = [NSURL URLWithString:urlString];
  if (!url) {
    reject(@"INVALID_URL", @"Invalid URL provided", nil);
    return;
  }

  self.resolve = resolve;
  self.reject = reject;

  dispatch_async(dispatch_get_main_queue(), ^{
    NSURLRequest *request = [NSURLRequest requestWithURL:url];
    [self.webView loadRequest:request];
  });
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
  // Extract HTML content
  [webView evaluateJavaScript:@"document.documentElement.outerHTML" completionHandler:^(id result, NSError *error) {
    if (error) {
      if (self.reject) {
        self.reject(@"SCRAPE_ERROR", error.localizedDescription, error);
      }
    } else {
      NSString *html = result;

      // Extract additional metadata
      [self extractMetadataFromWebView:webView withHTML:html];
    }
  }];
}

- (void)extractMetadataFromWebView:(WKWebView *)webView withHTML:(NSString *)html {
  // Get page title
  [webView evaluateJavaScript:@"document.title" completionHandler:^(id title, NSError *error) {
    NSString *pageTitle = title ?: @"";

    // Get meta description
    [webView evaluateJavaScript:@"document.querySelector('meta[name=\"description\"]')?.content" completionHandler:^(id description, NSError *error) {
      NSString *metaDescription = description ?: @"";

      // Get all links
      [webView evaluateJavaScript:@"Array.from(document.querySelectorAll('a')).map(a => ({href: a.href, text: a.textContent.trim()})).filter(a => a.href)" completionHandler:^(id links, NSError *error) {
        NSArray *allLinks = links ?: @[];

        // Get all images
        [webView evaluateJavaScript:@"Array.from(document.querySelectorAll('img')).map(img => ({src: img.src, alt: img.alt}))" completionHandler:^(id images, NSError *error) {
          NSArray *allImages = images ?: @[];

          // Get text content
          [webView evaluateJavaScript:@"document.body.innerText" completionHandler:^(id textContent, NSError *error) {
            NSString *bodyText = textContent ?: @"";

            if (self.resolve) {
              self.resolve(@{
                @"html": html,
                @"title": pageTitle,
                @"description": metaDescription,
                @"links": allLinks,
                @"images": allImages,
                @"text": bodyText,
                @"url": webView.URL.absoluteString ?: @""
              });
            }

            self.resolve = nil;
            self.reject = nil;
          }];
        }];
      }];
    }];
  }];
}

- (void)webView:(WKWebView *)webView didFailNavigation:(WKNavigation *)navigation withError:(NSError *)error {
  if (self.reject) {
    self.reject(@"NAVIGATION_ERROR", error.localizedDescription, error);
    self.resolve = nil;
    self.reject = nil;
  }
}

#pragma mark - Execute JavaScript on Page

RCT_EXPORT_METHOD(executeScript:(NSString *)urlString
                  script:(NSString *)script
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *url = [NSURL URLWithString:urlString];
  if (!url) {
    reject(@"INVALID_URL", @"Invalid URL provided", nil);
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    NSURLRequest *request = [NSURLRequest requestWithURL:url];
    [self.webView loadRequest:request];

    // Wait for page to load, then execute script
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
      [self.webView evaluateJavaScript:script completionHandler:^(id result, NSError *error) {
        if (error) {
          reject(@"SCRIPT_ERROR", error.localizedDescription, error);
        } else {
          resolve(@{@"result": result ?: [NSNull null]});
        }
      }];
    });
  });
}

#pragma mark - Search Query Helper

RCT_EXPORT_METHOD(searchGoogle:(NSString *)query
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *encodedQuery = [query stringByAddingPercentEncodingWithAllowedCharacters:[NSCharacterSet URLQueryAllowedCharacterSet]];
  NSString *searchURL = [NSString stringWithFormat:@"https://www.google.com/search?q=%@", encodedQuery];

  [self scrapeWebpage:searchURL options:@{} resolver:resolve rejecter:reject];
}

#pragma mark - Download File

RCT_EXPORT_METHOD(downloadFile:(NSString *)urlString
                  destination:(NSString *)destinationPath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *url = [NSURL URLWithString:urlString];
  if (!url) {
    reject(@"INVALID_URL", @"Invalid URL provided", nil);
    return;
  }

  NSURLSessionConfiguration *config = [NSURLSessionConfiguration defaultSessionConfiguration];
  NSURLSession *session = [NSURLSession sessionWithConfiguration:config];

  NSURLSessionDownloadTask *task = [session downloadTaskWithURL:url completionHandler:^(NSURL *location, NSURLResponse *response, NSError *error) {
    if (error) {
      reject(@"DOWNLOAD_ERROR", error.localizedDescription, error);
      return;
    }

    NSError *moveError = nil;
    NSURL *destinationURL = [NSURL fileURLWithPath:destinationPath];

    // Remove existing file if present
    [[NSFileManager defaultManager] removeItemAtURL:destinationURL error:nil];

    // Move downloaded file to destination
    [[NSFileManager defaultManager] moveItemAtURL:location toURL:destinationURL error:&moveError];

    if (moveError) {
      reject(@"MOVE_ERROR", moveError.localizedDescription, moveError);
    } else {
      NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
      NSDictionary *fileAttributes = [[NSFileManager defaultManager] attributesOfItemAtPath:destinationPath error:nil];

      resolve(@{
        @"path": destinationPath,
        @"size": fileAttributes[NSFileSize] ?: @0,
        @"mimeType": httpResponse.MIMEType ?: @"",
        @"status": @(httpResponse.statusCode)
      });
    }
  }];

  [task resume];
}

#pragma mark - Get Cookies

RCT_EXPORT_METHOD(getCookies:(NSString *)urlString
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *url = [NSURL URLWithString:urlString];
  if (!url) {
    reject(@"INVALID_URL", @"Invalid URL provided", nil);
    return;
  }

  WKHTTPCookieStore *cookieStore = self.webView.configuration.websiteDataStore.httpCookieStore;

  [cookieStore getAllCookies:^(NSArray<NSHTTPCookie *> *cookies) {
    NSMutableArray *result = [NSMutableArray array];

    for (NSHTTPCookie *cookie in cookies) {
      if ([cookie.domain containsString:url.host]) {
        [result addObject:@{
          @"name": cookie.name,
          @"value": cookie.value,
          @"domain": cookie.domain,
          @"path": cookie.path,
          @"secure": @(cookie.isSecure),
          @"httpOnly": @(cookie.isHTTPOnly)
        }];
      }
    }

    resolve(result);
  }];
}

#pragma mark - Set Cookie

RCT_EXPORT_METHOD(setCookie:(NSDictionary *)cookieData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSMutableDictionary *properties = [NSMutableDictionary dictionary];

  properties[NSHTTPCookieName] = cookieData[@"name"];
  properties[NSHTTPCookieValue] = cookieData[@"value"];
  properties[NSHTTPCookieDomain] = cookieData[@"domain"];
  properties[NSHTTPCookiePath] = cookieData[@"path"] ?: @"/";

  if (cookieData[@"secure"]) {
    properties[NSHTTPCookieSecure] = @"TRUE";
  }

  NSHTTPCookie *cookie = [NSHTTPCookie cookieWithProperties:properties];

  if (cookie) {
    WKHTTPCookieStore *cookieStore = self.webView.configuration.websiteDataStore.httpCookieStore;
    [cookieStore setCookie:cookie completionHandler:^{
      resolve(@{@"success": @YES});
    }];
  } else {
    reject(@"INVALID_COOKIE", @"Could not create cookie", nil);
  }
}

#pragma mark - Clear Cache

RCT_EXPORT_METHOD(clearCache:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSSet *dataTypes = [NSSet setWithArray:@[
    WKWebsiteDataTypeDiskCache,
    WKWebsiteDataTypeMemoryCache,
    WKWebsiteDataTypeCookies,
    WKWebsiteDataTypeSessionStorage,
    WKWebsiteDataTypeLocalStorage
  ]];

  NSDate *dateFrom = [NSDate dateWithTimeIntervalSince1970:0];

  [[WKWebsiteDataStore defaultDataStore] removeDataOfTypes:dataTypes
                                             modifiedSince:dateFrom
                                         completionHandler:^{
    resolve(@{@"cleared": @YES});
  }];
}

@end
