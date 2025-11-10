#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface HapticsTurboModule : NSObject <RCTBridgeModule>
@end

@implementation HapticsTurboModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(impact:(NSString *)style
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UIImpactFeedbackStyle feedbackStyle = UIImpactFeedbackStyleMedium;

    if ([style isEqualToString:@"light"]) {
      feedbackStyle = UIImpactFeedbackStyleLight;
    } else if ([style isEqualToString:@"medium"]) {
      feedbackStyle = UIImpactFeedbackStyleMedium;
    } else if ([style isEqualToString:@"heavy"]) {
      feedbackStyle = UIImpactFeedbackStyleHeavy;
    } else if ([style isEqualToString:@"rigid"]) {
      feedbackStyle = UIImpactFeedbackStyleRigid;
    } else if ([style isEqualToString:@"soft"]) {
      feedbackStyle = UIImpactFeedbackStyleSoft;
    }

    UIImpactFeedbackGenerator *generator = [[UIImpactFeedbackGenerator alloc] initWithStyle:feedbackStyle];
    [generator prepare];
    [generator impactOccurred];

    resolve(@{@"success": @YES});
  });
}

RCT_EXPORT_METHOD(notification:(NSString *)type
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UINotificationFeedbackType feedbackType = UINotificationFeedbackTypeSuccess;

    if ([type isEqualToString:@"success"]) {
      feedbackType = UINotificationFeedbackTypeSuccess;
    } else if ([type isEqualToString:@"warning"]) {
      feedbackType = UINotificationFeedbackTypeWarning;
    } else if ([type isEqualToString:@"error"]) {
      feedbackType = UINotificationFeedbackTypeError;
    }

    UINotificationFeedbackGenerator *generator = [[UINotificationFeedbackGenerator alloc] init];
    [generator prepare];
    [generator notificationOccurred:feedbackType];

    resolve(@{@"success": @YES});
  });
}

RCT_EXPORT_METHOD(selection:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    UISelectionFeedbackGenerator *generator = [[UISelectionFeedbackGenerator alloc] init];
    [generator prepare];
    [generator selectionChanged];

    resolve(@{@"success": @YES});
  });
}

@end
