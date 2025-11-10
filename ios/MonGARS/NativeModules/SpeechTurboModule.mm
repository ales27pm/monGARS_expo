#import <React/RCTBridgeModule.h>
#import <AVFoundation/AVFoundation.h>

@interface SpeechTurboModule : NSObject <RCTBridgeModule, AVSpeechSynthesizerDelegate>
@property(nonatomic, strong) AVSpeechSynthesizer *synthesizer;
@property(nonatomic, copy) RCTPromiseResolveBlock resolve;
@property(nonatomic, copy) RCTPromiseRejectBlock reject;
@end

@implementation SpeechTurboModule

RCT_EXPORT_MODULE();

- (instancetype)init {
  if (self = [super init]) {
    _synthesizer = [[AVSpeechSynthesizer alloc] init];
    _synthesizer.delegate = self;
  }
  return self;
}

RCT_EXPORT_METHOD(speak:(NSString *)text
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (!text || text.length == 0) {
    reject(@"INVALID_ARGUMENT", @"Text is required", nil);
    return;
  }

  self.resolve = resolve;
  self.reject = reject;

  AVSpeechUtterance *utterance = [AVSpeechUtterance speechUtteranceWithString:text];

  // Set language
  NSString *language = options[@"language"];
  if (language) {
    utterance.voice = [AVSpeechSynthesisVoice voiceWithLanguage:language];
  }

  // Set rate (0.0 to 1.0, default 0.5)
  NSNumber *rate = options[@"rate"];
  if (rate) {
    utterance.rate = [rate floatValue];
  } else {
    utterance.rate = AVSpeechUtteranceDefaultSpeechRate;
  }

  // Set pitch (0.5 to 2.0, default 1.0)
  NSNumber *pitch = options[@"pitch"];
  if (pitch) {
    utterance.pitchMultiplier = [pitch floatValue];
  }

  // Set volume (0.0 to 1.0, default 1.0)
  NSNumber *volume = options[@"volume"];
  if (volume) {
    utterance.volume = [volume floatValue];
  }

  [self.synthesizer speakUtterance:utterance];
}

RCT_EXPORT_METHOD(stop:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  [self.synthesizer stopSpeakingAtBoundary:AVSpeechBoundaryImmediate];
  resolve(@{@"stopped": @YES});
}

RCT_EXPORT_METHOD(pause:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  [self.synthesizer pauseSpeakingAtBoundary:AVSpeechBoundaryImmediate];
  resolve(@{@"paused": @YES});
}

RCT_EXPORT_METHOD(resume:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  [self.synthesizer continueSpeaking];
  resolve(@{@"resumed": @YES});
}

RCT_EXPORT_METHOD(isSpeaking:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@{@"speaking": @(self.synthesizer.speaking)});
}

RCT_EXPORT_METHOD(getAvailableVoices:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSArray *voices = [AVSpeechSynthesisVoice speechVoices];
  NSMutableArray *result = [NSMutableArray array];

  for (AVSpeechSynthesisVoice *voice in voices) {
    [result addObject:@{
      @"identifier": voice.identifier,
      @"name": voice.name,
      @"language": voice.language,
      @"quality": @(voice.quality)
    }];
  }

  resolve(result);
}

#pragma mark - AVSpeechSynthesizerDelegate

- (void)speechSynthesizer:(AVSpeechSynthesizer *)synthesizer didFinishSpeechUtterance:(AVSpeechUtterance *)utterance {
  if (self.resolve) {
    self.resolve(@{@"finished": @YES});
    self.resolve = nil;
    self.reject = nil;
  }
}

- (void)speechSynthesizer:(AVSpeechSynthesizer *)synthesizer didCancelSpeechUtterance:(AVSpeechUtterance *)utterance {
  if (self.reject) {
    self.reject(@"CANCELLED", @"Speech was cancelled", nil);
    self.resolve = nil;
    self.reject = nil;
  }
}

@end
