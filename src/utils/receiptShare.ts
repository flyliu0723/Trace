import { Platform, Share } from 'react-native';
import type { ShareReceipt } from '../analysis/receiptShareFormatter';
import { formatShareReceiptText } from '../analysis/receiptShareFormatter';
import { shareReceiptImageNative } from '../native/ReceiptShare';

const RECEIPT_CAPTURE_OPTIONS = {
  format: 'png' as const,
  quality: 1,
  result: 'tmpfile' as const,
  fileName: 'spendwhere-receipt',
};

function getReceiptShareTitle(receipt: ShareReceipt): string {
  return receipt.kind === 'weekly'
    ? `${receipt.periodLabel} 周结小票`
    : `${receipt.periodLabel} 日结小票`;
}

function normalizeShareUri(uri: string): string {
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return uri;
  }
  return `file://${uri}`;
}

/** 分享截图 URI，失败时抛出以便上层区分截图与分享阶段 */
export async function shareReceiptImageUri(
  uri: string,
  receipt: ShareReceipt,
): Promise<void> {
  const title = getReceiptShareTitle(receipt);
  const fallbackMessage = formatShareReceiptText(receipt);
  const normalizedUri = normalizeShareUri(uri);

  if (Platform.OS === 'android') {
    const sharedNatively = await shareReceiptImageNative(normalizedUri, title);
    if (sharedNatively) {
      return;
    }

    await Share.share({
      title,
      url: normalizedUri,
    });
    return;
  }

  await Share.share({
    title,
    url: normalizedUri,
    message: fallbackMessage,
  });
}

export { RECEIPT_CAPTURE_OPTIONS, getReceiptShareTitle };
