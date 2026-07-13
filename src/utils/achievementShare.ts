import { Platform, Share } from 'react-native';
import {
  formatShareAchievementText,
  getAchievementShareTitle,
  type ShareAchievement,
} from '../analysis/achievementShareFormatter';
import { shareReceiptImageNative } from '../native/ReceiptShare';

const ACHIEVEMENT_CAPTURE_OPTIONS = {
  format: 'png' as const,
  quality: 1,
  result: 'tmpfile' as const,
  fileName: 'spendwhere-achievement',
};

function normalizeShareUri(uri: string): string {
  if (uri.startsWith('file://') || uri.startsWith('content://')) {
    return uri;
  }
  return `file://${uri}`;
}

/** 分享成就截图 URI，失败时抛出以便上层区分截图与分享阶段 */
export async function shareAchievementImageUri(
  uri: string,
  payload: ShareAchievement,
): Promise<void> {
  const title = getAchievementShareTitle(payload);
  const fallbackMessage = formatShareAchievementText(payload);
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

export { ACHIEVEMENT_CAPTURE_OPTIONS, getAchievementShareTitle };
