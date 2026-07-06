import { NativeModules, Platform } from 'react-native';

interface ReceiptShareNativeModule {
  shareImage(filePath: string, title: string): Promise<boolean>;
}

const nativeModule = NativeModules.ReceiptShare as ReceiptShareNativeModule | undefined;

export async function shareReceiptImageNative(
  filePath: string,
  title: string,
): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeModule?.shareImage) {
    return false;
  }
  await nativeModule.shareImage(filePath, title);
  return true;
}
