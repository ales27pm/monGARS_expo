#import <React/RCTBridgeModule.h>
#import "React/RCTUtils.h"
#import <MessageUI/MFMailComposeViewController.h>

@interface MailComposerTurboModule : NSObject <RCTBridgeModule, MFMailComposeViewControllerDelegate>
@property(nonatomic, copy) RCTPromiseResolveBlock resolve;
@property(nonatomic, copy) RCTPromiseRejectBlock reject;
@end

@implementation MailComposerTurboModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(canSendMail:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@{@"canSend": @([MFMailComposeViewController canSendMail])});
}

RCT_EXPORT_METHOD(composeEmail:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (![MFMailComposeViewController canSendMail]) {
    reject(@"NOT_SUPPORTED", @"Mail not available on this device", nil);
    return;
  }

  dispatch_async(dispatch_get_main_queue(), ^{
    MFMailComposeViewController *vc = [[MFMailComposeViewController alloc] init];
    vc.mailComposeDelegate = self;

    // Set recipients
    NSArray *to = options[@"to"];
    if (to) [vc setToRecipients:to];

    NSArray *cc = options[@"cc"];
    if (cc) [vc setCcRecipients:cc];

    NSArray *bcc = options[@"bcc"];
    if (bcc) [vc setBccRecipients:bcc];

    // Set subject
    NSString *subject = options[@"subject"];
    if (subject) [vc setSubject:subject];

    // Set body
    NSString *body = options[@"body"];
    BOOL isHTML = [options[@"isHTML"] boolValue];
    if (body) [vc setMessageBody:body isHTML:isHTML];

    self.resolve = resolve;
    self.reject = reject;

    UIViewController *root = RCTPresentedViewController();
    if (!root) {
      if (self.reject) {
        self.reject(@"NO_VIEW_CONTROLLER", @"Unable to present mail composer", nil);
        self.resolve = nil;
        self.reject = nil;
      }
      return;
    }

    [root presentViewController:vc animated:YES completion:nil];
  });
}

#pragma mark - MFMailComposeViewControllerDelegate

- (void)mailComposeController:(MFMailComposeViewController *)controller
           didFinishWithResult:(MFMailComposeResult)result
                         error:(NSError *)error
{
  [controller dismissViewControllerAnimated:YES completion:nil];

  if (error) {
    if (self.reject) self.reject(@"ERROR", error.localizedDescription, error);
  } else if (result == MFMailComposeResultSent) {
    if (self.resolve) self.resolve(@{@"success": @YES});
  } else if (result == MFMailComposeResultFailed) {
    if (self.reject) self.reject(@"FAILED", @"Mail send failed", nil);
  } else if (result == MFMailComposeResultCancelled) {
    if (self.reject) self.reject(@"CANCELLED", @"User cancelled", nil);
  } else {
    if (self.resolve) self.resolve(@{@"success": @NO});
  }

  self.resolve = nil;
  self.reject = nil;
}

@end
