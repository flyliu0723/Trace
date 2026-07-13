/** 成就分类 */
export type AchievementCategory =
  | 'first_time'
  | 'rhythm'
  | 'humor'
  | 'streak';

/** 稀有度（影响徽章视觉权重） */
export type AchievementRarity = 'common' | 'rare' | 'epic';

export type AchievementRuleId =
  | 'first-flow'
  | 'first-quiet-entertain'
  | 'sound-companion'
  | 'walking-listen'
  | 'vehicle-listen'
  | 'polite-glance'
  | 'schrodinger-unlock'
  | 'deep-browse'
  | 'record-streak-7'
  | 'late-night-streak-3';

export interface AchievementStoryStep {
  label: string;
}

export interface AchievementEvidence {
  date: string;
  summary: string;
  metrics?: Record<string, number | string>;
  steps: AchievementStoryStep[];
}

export interface AchievementDefinition {
  id: AchievementRuleId;
  name: string;
  /** 解锁后详情旁白 */
  blurb: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  /** Ionicons 名 */
  icon: string;
  /** 未解锁时的模糊提示，不剧透硬条件 */
  hint: string;
  /** 全局仅解锁一次 */
  onceOnly: boolean;
}

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  {
    id: 'first-flow',
    name: '第一次沉浸',
    blurb: '你第一次在某个 App 里连续待了足够久，注意力真正落了下来。',
    category: 'first_time',
    rarity: 'common',
    icon: 'water-outline',
    hint: '与专注时段有关',
    onceOnly: true,
  },
  {
    id: 'first-quiet-entertain',
    name: '第一次克制刷屏',
    blurb: '今天有娱乐，但没有陷入长时间沉迷——分寸感值得记住。',
    category: 'first_time',
    rarity: 'common',
    icon: 'leaf-outline',
    hint: '与娱乐节奏有关',
    onceOnly: true,
  },
  {
    id: 'sound-companion',
    name: '声音陪伴者',
    blurb: '大部分收听发生在后台：手机在响，你不必一直盯着屏幕。',
    category: 'rhythm',
    rarity: 'common',
    icon: 'headset-outline',
    hint: '与收听有关',
    onceOnly: false,
  },
  {
    id: 'walking-listen',
    name: '边走边听',
    blurb: '脚步和声音叠在一起，像把一段路交给播客陪着走完。',
    category: 'rhythm',
    rarity: 'common',
    icon: 'walk-outline',
    hint: '与步行收听有关',
    onceOnly: false,
  },
  {
    id: 'vehicle-listen',
    name: '行进配乐',
    blurb: '在移动的路上，音频成了背景里的固定配乐。',
    category: 'rhythm',
    rarity: 'common',
    icon: 'car-outline',
    hint: '与行进收听有关',
    onceOnly: false,
  },
  {
    id: 'polite-glance',
    name: '礼貌摸一下',
    blurb: '解锁很多次，真正亮屏却不长——像只是确认世界还在。',
    category: 'humor',
    rarity: 'common',
    icon: 'hand-left-outline',
    hint: '与解锁频率有关',
    onceOnly: false,
  },
  {
    id: 'schrodinger-unlock',
    name: '薛定谔的解锁',
    blurb: '解锁了无数次，却几乎没待多久。手机：你礼貌吗？',
    category: 'humor',
    rarity: 'rare',
    icon: 'flash-outline',
    hint: '与高频解锁有关',
    onceOnly: false,
  },
  {
    id: 'deep-browse',
    name: '时空旅人',
    blurb: '你进入了一个很长的短视频/娱乐宇宙，回来时时间已经跳了格。',
    category: 'humor',
    rarity: 'rare',
    icon: 'planet-outline',
    hint: '与长时间浏览有关',
    onceOnly: false,
  },
  {
    id: 'record-streak-7',
    name: '七日记事',
    blurb: '连续七天都留下了行为足迹——记录本身也是一种节奏。',
    category: 'streak',
    rarity: 'rare',
    icon: 'calendar-outline',
    hint: '与连续记录有关',
    onceOnly: false,
  },
  {
    id: 'late-night-streak-3',
    name: '凌晨还醒着',
    blurb: '连续好几天，睡前最后一次使用已经跨过零点。',
    category: 'streak',
    rarity: 'epic',
    icon: 'moon-outline',
    hint: '与深夜使用有关',
    onceOnly: false,
  },
];

export const ACHIEVEMENT_TOTAL = ACHIEVEMENT_CATALOG.length;

const CATALOG_BY_ID = new Map(ACHIEVEMENT_CATALOG.map((item) => [item.id, item]));

export function getAchievementDefinition(id: string): AchievementDefinition | undefined {
  return CATALOG_BY_ID.get(id as AchievementRuleId);
}

export function getCategoryLabel(category: AchievementCategory): string {
  switch (category) {
    case 'first_time':
      return '人生第一次';
    case 'rhythm':
      return '节奏发现';
    case 'humor':
      return '幽默观察';
    case 'streak':
      return '轻量连续';
    default:
      return '发现';
  }
}
