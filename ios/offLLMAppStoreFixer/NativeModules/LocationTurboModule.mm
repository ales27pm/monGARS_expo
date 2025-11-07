#import <React/RCTBridgeModule.h>
#import "React/RCTEventEmitter.h"
#import <CoreLocation/CoreLocation.h>

@interface LocationTurboModule : RCTEventEmitter <RCTBridgeModule, CLLocationManagerDelegate>
@end

@implementation LocationTurboModule {
  CLLocationManager *_manager;
  RCTPromiseResolveBlock _resolve;
  RCTPromiseRejectBlock _reject;
  BOOL _isWatchingLocation;
}

RCT_EXPORT_MODULE();

- (NSArray<NSString *> *)supportedEvents {
  return @[@"locationUpdate", @"locationError"];
}

- (dispatch_queue_t)methodQueue {
  return dispatch_get_main_queue();
}

RCT_EXPORT_METHOD(getCurrentLocation:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  _resolve = resolve;
  _reject = reject;

  if (!_manager) {
    _manager = [[CLLocationManager alloc] init];
    _manager.delegate = self;
    _manager.desiredAccuracy = kCLLocationAccuracyBest;
  }

  CLAuthorizationStatus status = [CLLocationManager authorizationStatus];

  if (status == kCLAuthorizationStatusNotDetermined) {
    [_manager requestWhenInUseAuthorization];
  } else if (status == kCLAuthorizationStatusDenied || status == kCLAuthorizationStatusRestricted) {
    reject(@"PERMISSION_DENIED", @"Location permission denied", nil);
    _resolve = nil;
    _reject = nil;
    return;
  } else {
    [_manager requestLocation];
  }
}

RCT_EXPORT_METHOD(watchPosition:(NSInteger)distanceFilter)
{
  if (!_manager) {
    _manager = [[CLLocationManager alloc] init];
    _manager.delegate = self;
    _manager.desiredAccuracy = kCLLocationAccuracyBest;
  }

  _manager.distanceFilter = distanceFilter > 0 ? distanceFilter : 10.0;
  _isWatchingLocation = YES;

  CLAuthorizationStatus status = [CLLocationManager authorizationStatus];
  if (status == kCLAuthorizationStatusNotDetermined) {
    [_manager requestWhenInUseAuthorization];
  } else if (status != kCLAuthorizationStatusDenied && status != kCLAuthorizationStatusRestricted) {
    [_manager startUpdatingLocation];
  }
}

RCT_EXPORT_METHOD(clearWatch)
{
  _isWatchingLocation = NO;
  [_manager stopUpdatingLocation];
}

#pragma mark - CLLocationManagerDelegate

- (void)locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray<CLLocation *> *)locations {
  CLLocation *location = locations.lastObject;

  NSDictionary *data = @{
    @"latitude": @(location.coordinate.latitude),
    @"longitude": @(location.coordinate.longitude),
    @"altitude": @(location.altitude),
    @"accuracy": @(location.horizontalAccuracy),
    @"altitudeAccuracy": @(location.verticalAccuracy),
    @"speed": @(location.speed),
    @"heading": @(location.course),
    @"timestamp": @([location.timestamp timeIntervalSince1970] * 1000)
  };

  if (_isWatchingLocation) {
    [self sendEventWithName:@"locationUpdate" body:data];
  }

  if (_resolve) {
    _resolve(data);
    _resolve = nil;
    _reject = nil;
  }
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error {
  if (_isWatchingLocation) {
    [self sendEventWithName:@"locationError" body:@{@"message": error.localizedDescription}];
  }

  if (_reject) {
    _reject(@"LOCATION_ERROR", error.localizedDescription, error);
    _resolve = nil;
    _reject = nil;
  }
}

- (void)locationManagerDidChangeAuthorization:(CLLocationManager *)manager {
  CLAuthorizationStatus status = [CLLocationManager authorizationStatus];

  if (status == kCLAuthorizationStatusAuthorizedWhenInUse || status == kCLAuthorizationStatusAuthorizedAlways) {
    if (_resolve) {
      [manager requestLocation];
    } else if (_isWatchingLocation) {
      [manager startUpdatingLocation];
    }
  } else if (status == kCLAuthorizationStatusDenied || status == kCLAuthorizationStatusRestricted) {
    if (_reject) {
      _reject(@"PERMISSION_DENIED", @"Location permission denied", nil);
      _resolve = nil;
      _reject = nil;
    }
  }
}

@end
