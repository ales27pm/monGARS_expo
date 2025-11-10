#import <React/RCTBridgeModule.h>

@interface CallTurboModule : NSObject <RCTBridgeModule>
@end

@implementation CallTurboModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(getRecentCalls:(NSInteger)limit resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  // Note: iOS does not provide API to access call history for privacy reasons
  // This returns empty array to match interface but cannot provide actual call data
  resolve(@[]);
}

@end
