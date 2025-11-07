#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface ClipboardTurboModule : NSObject <RCTBridgeModule>
@end

@implementation ClipboardTurboModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(getString:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  UIPasteboard *pasteboard = [UIPasteboard generalPasteboard];
  NSString *string = pasteboard.string;
  resolve(string ?: @"");
}

RCT_EXPORT_METHOD(setString:(NSString *)content
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  UIPasteboard *pasteboard = [UIPasteboard generalPasteboard];
  pasteboard.string = content ?: @"";
  resolve(@{@"success": @YES});
}

RCT_EXPORT_METHOD(hasString:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  UIPasteboard *pasteboard = [UIPasteboard generalPasteboard];
  BOOL hasString = pasteboard.hasStrings;
  resolve(@{@"hasString": @(hasString)});
}

RCT_EXPORT_METHOD(clear:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  UIPasteboard *pasteboard = [UIPasteboard generalPasteboard];
  pasteboard.string = @"";
  resolve(@{@"success": @YES});
}

@end
