import {
  classifyApp,
  getCategoryBadgeRadius,
  getCategoryColor,
  type AppCategory,
} from '../analysis/appClassifier';

/** 常见 App 的 emoji 映射，无图标库时的轻量替代 */
const PACKAGE_EMOJI: Record<string, string> = {
  'com.tencent.mm': '💬',
  'com.tencent.mobileqq': '🐧',
  'com.sina.weibo': '📰',
  'com.ss.android.ugc.aweme': '🎵',
  'com.smile.gifmaker': '📹',
  'com.xingin.xhs': '📕',
  'com.zhihu.android': '💡',
  'com.netease.cloudmusic': '🎧',
  'com.tencent.qqmusic': '🎵',
  'app.podcast.cosmos': '🎙️',
  'com.ximalaya.ting.android': '📻',
  'com.eg.android.AlipayGphone': '💰',
  'com.taobao.taobao': '🛒',
  'com.jingdong.app.mall': '🛍️',
  'com.baidu.BaiduMap': '🗺️',
  'com.autonavi.minimap': '🧭',
  'com.android.chrome': '🌐',
  'com.tencent.mtt': '🌐',
  'com.microsoft.emmx': '🌐',
  'com.android.vending': '📦',
  'com.spotify.music': '🎧',
  'com.bilibili.app.in': '📺',
  'tv.danmaku.bili': '📺',
  'com.example.piliplus': '📺',
  'com.example.piliplus.dev': '📺',
  'com.example.piliplus.debug': '📺',
  'com.fongmi.android.tv': '🎬',
  'com.twitter.android': '🐦',
  'com.tencent.weread': '📖',
  'com.dianping.v1': '🍔',
  'com.sankuai.meituan': '🍜',
  'com.tencent.wework': '💼',
  'com.alibaba.android.rimet': '💼',
};

const LABEL_EMOJI: Record<string, string> = {
  微信: '💬',
  抖音: '🎵',
  小红书: '📕',
  微博: '📰',
  网易云音乐: '🎧',
  QQ音乐: '🎵',
  小宇宙: '🎙️',
  喜马拉雅: '📻',
  支付宝: '💰',
  淘宝: '🛒',
  京东: '🛍️',
  高德地图: '🧭',
  百度地图: '🗺️',
  Chrome: '🌐',
  哔哩哔哩: '📺',
  B站: '📺',
  PiliPlus: '📺',
  影视: '🎬',
  Fongmi: '🎬',
  影視TV: '🎬',
  Twitter: '🐦',
  X: '𝕏',
  微信读书: '📖',
  美团: '🍜',
  钉钉: '💼',
  企业微信: '💼',
};

export interface AppVisual {
  emoji: string;
  tint: string;
  initial: string;
  category: AppCategory;
  borderRadius: number;
}

export function getAppVisual(
  packageName?: string,
  appLabel?: string,
  size = 36,
): AppVisual {
  const label = appLabel ?? packageName ?? '?';
  const category = classifyApp(packageName, appLabel);
  const emoji =
    (packageName && PACKAGE_EMOJI[packageName]) ||
    LABEL_EMOJI[label] ||
    '';
  const tint = getCategoryColor(category);
  const initial = label.charAt(0).toUpperCase();
  const borderRadius = getCategoryBadgeRadius(size, category);

  return { emoji, tint, initial, category, borderRadius };
}
