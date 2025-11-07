#import <React/RCTBridgeModule.h>
#import "PhotosTurboModule.h"
#import "React/RCTUtils.h"
#import <Photos/Photos.h>
#import <UIKit/UIKit.h>

@interface PhotosTurboModule () <UIImagePickerControllerDelegate, UINavigationControllerDelegate>
@property(nonatomic, strong) RCTPromiseResolveBlock resolver;
@property(nonatomic, strong) RCTPromiseRejectBlock rejecter;
@end

@implementation PhotosTurboModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(pickPhoto:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  self.resolver = resolve;
  self.rejecter = reject;

  [PHPhotoLibrary requestAuthorization:^(PHAuthorizationStatus status) {
    if (status != PHAuthorizationStatusAuthorized) {
      if (self.rejecter) {
        self.rejecter(@"PERMISSION_DENIED", @"Photos access denied", nil);
        self.resolver = nil;
        self.rejecter = nil;
      }
      return;
    }

    dispatch_async(dispatch_get_main_queue(), ^{
      UIImagePickerController *picker = [[UIImagePickerController alloc] init];
      picker.sourceType = UIImagePickerControllerSourceTypePhotoLibrary;
      picker.mediaTypes = @[@"public.image"];
      picker.delegate = self;

      UIViewController *root = RCTPresentedViewController();
      if (root) {
        [root presentViewController:picker animated:YES completion:nil];
      } else if (self.rejecter) {
        self.rejecter(@"NO_VIEW_CONTROLLER", @"Unable to present photo picker", nil);
        self.resolver = nil;
        self.rejecter = nil;
      }
    });
  }];
}

RCT_EXPORT_METHOD(getAlbums:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  [PHPhotoLibrary requestAuthorization:^(PHAuthorizationStatus status) {
    if (status != PHAuthorizationStatusAuthorized) {
      reject(@"PERMISSION_DENIED", @"Photos access denied", nil);
      return;
    }

    PHFetchOptions *options = [[PHFetchOptions alloc] init];
    PHFetchResult<PHAssetCollection *> *collections = [PHAssetCollection fetchAssetCollectionsWithType:PHAssetCollectionTypeAlbum subtype:PHAssetCollectionSubtypeAny options:options];

    NSMutableArray *albums = [NSMutableArray array];
    [collections enumerateObjectsUsingBlock:^(PHAssetCollection *collection, NSUInteger idx, BOOL *stop) {
      PHFetchResult *assets = [PHAsset fetchAssetsInAssetCollection:collection options:nil];
      [albums addObject:@{
        @"title": collection.localizedTitle ?: @"",
        @"count": @(assets.count),
        @"id": collection.localIdentifier
      }];
    }];

    resolve(albums);
  }];
}

#pragma mark - UIImagePickerControllerDelegate

- (void)imagePickerController:(UIImagePickerController *)picker
         didFinishPickingMediaWithInfo:(NSDictionary<UIImagePickerControllerInfoKey,id> *)info
{
  NSURL *url = info[UIImagePickerControllerImageURL];
  UIImage *image = info[UIImagePickerControllerOriginalImage];

  if (self.resolver) {
    NSMutableDictionary *result = [NSMutableDictionary dictionary];
    if (url) result[@"url"] = url.absoluteString;
    if (image) {
      result[@"width"] = @(image.size.width);
      result[@"height"] = @(image.size.height);
    }
    self.resolver(result);
  }

  self.resolver = nil;
  self.rejecter = nil;
  [picker dismissViewControllerAnimated:YES completion:nil];
}

- (void)imagePickerControllerDidCancel:(UIImagePickerController *)picker {
  if (self.rejecter) {
    self.rejecter(@"CANCELLED", @"User cancelled photo picker", nil);
  }
  self.resolver = nil;
  self.rejecter = nil;
  [picker dismissViewControllerAnimated:YES completion:nil];
}

@end
