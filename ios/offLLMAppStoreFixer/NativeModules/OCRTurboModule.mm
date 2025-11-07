#import <React/RCTBridgeModule.h>
#import <Vision/Vision.h>
#import <UIKit/UIKit.h>

@interface OCRTurboModule : NSObject <RCTBridgeModule>
@end

@implementation OCRTurboModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(recognizeText:(NSString *)imagePath
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSURL *imageURL = [NSURL fileURLWithPath:imagePath];
  UIImage *image = [UIImage imageWithContentsOfFile:imagePath];

  if (!image) {
    reject(@"INVALID_IMAGE", @"Could not load image", nil);
    return;
  }

  VNRecognizeTextRequest *request = [[VNRecognizeTextRequest alloc] initWithCompletionHandler:^(VNRequest *request, NSError *error) {
    if (error) {
      reject(@"RECOGNITION_ERROR", error.localizedDescription, error);
      return;
    }

    NSMutableArray *results = [NSMutableArray array];

    for (VNRecognizedTextObservation *observation in request.results) {
      VNRecognizedText *topCandidate = [observation topCandidates:1].firstObject;
      if (topCandidate) {
        CGRect boundingBox = observation.boundingBox;
        [results addObject:@{
          @"text": topCandidate.string,
          @"confidence": @(topCandidate.confidence),
          @"boundingBox": @{
            @"x": @(boundingBox.origin.x),
            @"y": @(boundingBox.origin.y),
            @"width": @(boundingBox.size.width),
            @"height": @(boundingBox.size.height)
          }
        }];
      }
    }

    resolve(results);
  }];

  request.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
  request.usesLanguageCorrection = YES;

  VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:image.CGImage options:@{}];

  NSError *error = nil;
  [handler performRequests:@[request] error:&error];

  if (error) {
    reject(@"HANDLER_ERROR", error.localizedDescription, error);
  }
}

@end
