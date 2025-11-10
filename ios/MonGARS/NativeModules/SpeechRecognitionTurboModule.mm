#import <React/RCTBridgeModule.h>
#import <Speech/Speech.h>
#import <AVFoundation/AVFoundation.h>

@interface SpeechRecognitionTurboModule : NSObject <RCTBridgeModule, SFSpeechRecognizerDelegate>
@property(nonatomic, strong) SFSpeechRecognizer *speechRecognizer;
@property(nonatomic, strong) SFSpeechAudioBufferRecognitionRequest *recognitionRequest;
@property(nonatomic, strong) SFSpeechRecognitionTask *recognitionTask;
@property(nonatomic, strong) AVAudioEngine *audioEngine;
@property(nonatomic, copy) RCTPromiseResolveBlock resolve;
@property(nonatomic, copy) RCTPromiseRejectBlock reject;
@end

@implementation SpeechRecognitionTurboModule

RCT_EXPORT_MODULE();

- (instancetype)init {
  if (self = [super init]) {
    _speechRecognizer = [[SFSpeechRecognizer alloc] initWithLocale:[NSLocale currentLocale]];
    _audioEngine = [[AVAudioEngine alloc] init];
  }
  return self;
}

RCT_EXPORT_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@{@"available": @(self.speechRecognizer.isAvailable)});
}

RCT_EXPORT_METHOD(requestPermission:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  [SFSpeechRecognizer requestAuthorization:^(SFSpeechRecognizerAuthorizationStatus status) {
    NSString *statusString = @"denied";
    switch (status) {
      case SFSpeechRecognizerAuthorizationStatusAuthorized:
        statusString = @"authorized";
        break;
      case SFSpeechRecognizerAuthorizationStatusDenied:
        statusString = @"denied";
        break;
      case SFSpeechRecognizerAuthorizationStatusRestricted:
        statusString = @"restricted";
        break;
      case SFSpeechRecognizerAuthorizationStatusNotDetermined:
        statusString = @"notDetermined";
        break;
    }
    resolve(@{@"status": statusString});
  }];
}

RCT_EXPORT_METHOD(startRecognition:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (self.audioEngine.isRunning) {
    reject(@"ALREADY_RUNNING", @"Recognition is already running", nil);
    return;
  }

  if (!self.speechRecognizer.isAvailable) {
    reject(@"NOT_AVAILABLE", @"Speech recognition is not available", nil);
    return;
  }

  self.resolve = resolve;
  self.reject = reject;

  self.recognitionRequest = [[SFSpeechAudioBufferRecognitionRequest alloc] init];
  self.recognitionRequest.shouldReportPartialResults = YES;

  AVAudioSession *audioSession = [AVAudioSession sharedInstance];
  NSError *error = nil;
  [audioSession setCategory:AVAudioSessionCategoryRecord mode:AVAudioSessionModeMeasurement options:0 error:&error];
  [audioSession setActive:YES withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation error:&error];

  if (error) {
    reject(@"AUDIO_SESSION_ERROR", error.localizedDescription, error);
    return;
  }

  AVAudioInputNode *inputNode = self.audioEngine.inputNode;
  AVAudioFormat *recordingFormat = [inputNode outputFormatForBus:0];

  [inputNode installTapOnBus:0 bufferSize:1024 format:recordingFormat block:^(AVAudioPCMBuffer *buffer, AVAudioTime *when) {
    [self.recognitionRequest appendAudioPCMBuffer:buffer];
  }];

  [self.audioEngine prepare];
  [self.audioEngine startAndReturnError:&error];

  if (error) {
    reject(@"ENGINE_START_ERROR", error.localizedDescription, error);
    return;
  }

  self.recognitionTask = [self.speechRecognizer recognitionTaskWithRequest:self.recognitionRequest resultHandler:^(SFSpeechRecognitionResult *result, NSError *error) {
    if (error) {
      [self stopRecognition];
      if (self.reject) {
        self.reject(@"RECOGNITION_ERROR", error.localizedDescription, error);
        self.resolve = nil;
        self.reject = nil;
      }
      return;
    }

    if (result.isFinal) {
      [self stopRecognition];
      if (self.resolve) {
        self.resolve(@{
          @"text": result.bestTranscription.formattedString,
          @"isFinal": @YES
        });
        self.resolve = nil;
        self.reject = nil;
      }
    }
  }];
}

RCT_EXPORT_METHOD(stopRecognition:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  [self stopRecognition];
  resolve(@{@"stopped": @YES});
}

- (void)stopRecognition {
  [self.audioEngine stop];
  [self.audioEngine.inputNode removeTapOnBus:0];
  [self.recognitionRequest endAudio];
  [self.recognitionTask cancel];

  self.recognitionRequest = nil;
  self.recognitionTask = nil;
}

@end
