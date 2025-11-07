#import <React/RCTBridgeModule.h>
#import <LocalAuthentication/LocalAuthentication.h>

@interface BiometricsTurboModule : NSObject <RCTBridgeModule>
@end

@implementation BiometricsTurboModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  LAContext *context = [[LAContext alloc] init];
  NSError *error = nil;

  BOOL canEvaluate = [context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:&error];

  NSString *biometryType = @"none";
  if (canEvaluate) {
    switch (context.biometryType) {
      case LABiometryTypeFaceID:
        biometryType = @"FaceID";
        break;
      case LABiometryTypeTouchID:
        biometryType = @"TouchID";
        break;
      default:
        biometryType = @"unknown";
        break;
    }
  }

  resolve(@{
    @"available": @(canEvaluate),
    @"biometryType": biometryType,
    @"error": error ? error.localizedDescription : [NSNull null]
  });
}

RCT_EXPORT_METHOD(authenticate:(NSString *)reason
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  LAContext *context = [[LAContext alloc] init];
  NSError *error = nil;

  if (![context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:&error]) {
    reject(@"NOT_AVAILABLE", @"Biometrics not available", error);
    return;
  }

  [context evaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics
          localizedReason:reason ?: @"Authenticate to continue"
                    reply:^(BOOL success, NSError *error) {
    dispatch_async(dispatch_get_main_queue(), ^{
      if (success) {
        resolve(@{@"success": @YES});
      } else {
        NSString *errorCode = @"AUTHENTICATION_FAILED";
        NSString *errorMessage = @"Authentication failed";

        if (error) {
          switch (error.code) {
            case LAErrorUserCancel:
              errorCode = @"USER_CANCEL";
              errorMessage = @"User cancelled authentication";
              break;
            case LAErrorUserFallback:
              errorCode = @"USER_FALLBACK";
              errorMessage = @"User chose fallback";
              break;
            case LAErrorSystemCancel:
              errorCode = @"SYSTEM_CANCEL";
              errorMessage = @"System cancelled authentication";
              break;
            case LAErrorPasscodeNotSet:
              errorCode = @"PASSCODE_NOT_SET";
              errorMessage = @"Passcode not set";
              break;
            case LAErrorBiometryNotAvailable:
              errorCode = @"NOT_AVAILABLE";
              errorMessage = @"Biometry not available";
              break;
            case LAErrorBiometryNotEnrolled:
              errorCode = @"NOT_ENROLLED";
              errorMessage = @"Biometry not enrolled";
              break;
            case LAErrorBiometryLockout:
              errorCode = @"LOCKOUT";
              errorMessage = @"Biometry locked out";
              break;
            default:
              errorMessage = error.localizedDescription;
              break;
          }
        }

        reject(errorCode, errorMessage, error);
      }
    });
  }];
}

@end
