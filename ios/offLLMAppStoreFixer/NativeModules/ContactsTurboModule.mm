#import <React/RCTBridgeModule.h>
#import <Contacts/Contacts.h>

@interface ContactsTurboModule : NSObject <RCTBridgeModule>
@end

@implementation ContactsTurboModule

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(findContacts:(NSString *)query
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  CNContactStore *store = [[CNContactStore alloc] init];

  [store requestAccessForEntityType:CNEntityTypeContacts completionHandler:^(BOOL granted, NSError *error) {
    if (!granted || error) {
      reject(@"PERMISSION_DENIED", @"Contacts access denied", error);
      return;
    }

    NSArray *keysToFetch = @[
      CNContactGivenNameKey,
      CNContactFamilyNameKey,
      CNContactPhoneNumbersKey,
      CNContactEmailAddressesKey,
      CNContactIdentifierKey
    ];

    NSPredicate *predicate = nil;
    if (query && query.length > 0) {
      predicate = [CNContact predicateForContactsMatchingName:query];
    }

    NSError *fetchError = nil;
    NSArray *contacts = predicate ?
      [store unifiedContactsMatchingPredicate:predicate keysToFetch:keysToFetch error:&fetchError] :
      @[];

    if (fetchError) {
      reject(@"FETCH_ERROR", fetchError.localizedDescription, fetchError);
      return;
    }

    NSMutableArray *results = [NSMutableArray array];
    for (CNContact *contact in contacts) {
      NSMutableArray *phones = [NSMutableArray array];
      for (CNLabeledValue *phone in contact.phoneNumbers) {
        [phones addObject:((CNPhoneNumber *)phone.value).stringValue];
      }

      NSMutableArray *emails = [NSMutableArray array];
      for (CNLabeledValue *email in contact.emailAddresses) {
        [emails addObject:(NSString *)email.value];
      }

      [results addObject:@{
        @"id": contact.identifier,
        @"name": [NSString stringWithFormat:@"%@ %@", contact.givenName ?: @"", contact.familyName ?: @""],
        @"phones": phones,
        @"emails": emails
      }];
    }

    resolve(results);
  }];
}

RCT_EXPORT_METHOD(addContact:(NSString *)givenName
                  familyName:(NSString *)familyName
                  phone:(NSString *)phone
                  email:(NSString *)email
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  CNContactStore *store = [[CNContactStore alloc] init];

  [store requestAccessForEntityType:CNEntityTypeContacts completionHandler:^(BOOL granted, NSError *error) {
    if (!granted || error) {
      reject(@"PERMISSION_DENIED", @"Contacts access denied", error);
      return;
    }

    CNMutableContact *contact = [[CNMutableContact alloc] init];
    contact.givenName = givenName ?: @"";
    contact.familyName = familyName ?: @"";

    if (phone && phone.length > 0) {
      CNLabeledValue *phoneValue = [CNLabeledValue labeledValueWithLabel:CNLabelPhoneNumberMain
                                                                    value:[CNPhoneNumber phoneNumberWithStringValue:phone]];
      contact.phoneNumbers = @[phoneValue];
    }

    if (email && email.length > 0) {
      CNLabeledValue *emailValue = [CNLabeledValue labeledValueWithLabel:CNLabelHome value:email];
      contact.emailAddresses = @[emailValue];
    }

    CNSaveRequest *saveRequest = [[CNSaveRequest alloc] init];
    [saveRequest addContact:contact toContainerWithIdentifier:nil];

    NSError *saveError = nil;
    [store executeSaveRequest:saveRequest error:&saveError];

    if (saveError) {
      reject(@"SAVE_ERROR", saveError.localizedDescription, saveError);
    } else {
      resolve(@{@"success": @YES, @"id": contact.identifier});
    }
  }];
}

@end
