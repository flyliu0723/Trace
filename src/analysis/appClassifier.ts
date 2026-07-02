/** App 行为分类 */
export type AppCategory =
  | 'utility'
  | 'social'
  | 'entertainment'
  | 'shopping'
  | 'navigation'
  | 'media'
  | 'work'
  | 'other';

const PACKAGE_CATEGORY: Record<string, AppCategory> = {
  'com.tencent.mm': 'social',
  'com.tencent.mobileqq': 'social',
  'com.sina.weibo': 'social',
  'com.ss.android.ugc.aweme': 'entertainment',
  'com.smile.gifmaker': 'entertainment',
  'com.xingin.xhs': 'entertainment',
  'com.zhihu.android': 'entertainment',
  'tv.danmaku.bili': 'entertainment',
  'com.bilibili.app.in': 'entertainment',
  'com.netease.cloudmusic': 'media',
  'com.tencent.qqmusic': 'media',
  'app.podcast.cosmos': 'media',
  'com.ximalaya.ting.android': 'media',
  'com.eg.android.AlipayGphone': 'utility',
  'com.taobao.taobao': 'shopping',
  'com.jingdong.app.mall': 'shopping',
  'com.baidu.BaiduMap': 'navigation',
  'com.autonavi.minimap': 'navigation',
  'com.android.chrome': 'work',
  'com.tencent.wework': 'work',
  'com.alibaba.android.rimet': 'work',
  'com.dianping.v1': 'utility',
  'com.sankuai.meituan': 'utility',
};

const LABEL_CATEGORY: Record<string, AppCategory> = {
  微信: 'social',
  QQ: 'social',
  微博: 'social',
  抖音: 'entertainment',
  小红书: 'entertainment',
  哔哩哔哩: 'entertainment',
  B站: 'entertainment',
  网易云音乐: 'media',
  QQ音乐: 'media',
  小宇宙: 'media',
  支付宝: 'utility',
  淘宝: 'shopping',
  京东: 'shopping',
  高德地图: 'navigation',
  百度地图: 'navigation',
  美团: 'utility',
  钉钉: 'work',
  企业微信: 'work',
};

const CATEGORY_LABELS: Record<AppCategory, string> = {
  utility: '工具',
  social: '社交',
  entertainment: '娱乐',
  shopping: '购物',
  navigation: '出行',
  media: '音频',
  work: '工作',
  other: '其他',
};

export function classifyApp(packageName?: string, appLabel?: string): AppCategory {
  if (packageName && PACKAGE_CATEGORY[packageName]) {
    return PACKAGE_CATEGORY[packageName];
  }
  if (appLabel && LABEL_CATEGORY[appLabel]) {
    return LABEL_CATEGORY[appLabel];
  }
  return 'other';
}

export function getCategoryLabel(category: AppCategory): string {
  return CATEGORY_LABELS[category];
}

/** 类别语义色（莫兰迪深色体系） */
export const CATEGORY_COLORS: Record<AppCategory, string> = {
  utility: '#5E81AC',
  social: '#B48EAD',
  entertainment: '#D08770',
  shopping: '#EBCB8B',
  navigation: '#88C0D0',
  media: '#A3BE8C',
  work: '#81A1C1',
  other: '#6B7280',
};

export function getCategoryColor(category: AppCategory): string {
  return CATEGORY_COLORS[category];
}

/** 柔和圆角类别（社交/娱乐类） */
const SOFT_RADIUS_CATEGORIES = new Set<AppCategory>(['social', 'entertainment', 'media']);

/** 硬朗圆角类别（工具/工作类） */
const SHARP_RADIUS_CATEGORIES = new Set<AppCategory>(['work', 'utility', 'navigation', 'shopping']);

export function getCategoryBadgeRadius(size: number, category: AppCategory): number {
  if (SOFT_RADIUS_CATEGORIES.has(category)) {
    return size / 2.4;
  }
  if (SHARP_RADIUS_CATEGORIES.has(category)) {
    return size / 6;
  }
  return size / 4;
}

export const CATEGORY_LEGEND: AppCategory[] = [
  'utility',
  'social',
  'entertainment',
  'media',
  'work',
  'shopping',
  'navigation',
  'other',
];

export const PRODUCTIVE_CATEGORIES = new Set<AppCategory>([
  'utility',
  'shopping',
  'navigation',
  'work',
]);

export const ENTERTAINMENT_CATEGORIES = new Set<AppCategory>(['entertainment', 'social']);
