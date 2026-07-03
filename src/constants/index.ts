/** 应用版本号（与 package.json 保持同步） */
export const APP_VERSION = '0.1.0';

/** 一小时的毫秒数 */
export const HOUR_MS = 60 * 60_000;

/** 短会话阈值（毫秒），解锁到锁屏小于此值视为 Quick Session */
export const QUICK_SESSION_THRESHOLD_MS = 20_000;

/** 解锁到首个 App 的空档阈值（毫秒） */
export const IDLE_GAP_THRESHOLD_MS = 5_000;

/** 前台服务通知渠道 */
export const MONITOR_NOTIFICATION_CHANNEL_ID = 'spendwhere_monitor';

/** 数据库名 */
export const DATABASE_NAME = 'spendwhere.db';

/** 数据库表名 */
export const EVENTS_TABLE = 'behavior_events';

/** 对账默认回溯时长（毫秒），无历史记录时使用 */
export const DEFAULT_RECONCILE_LOOKBACK_MS = 24 * 60 * 60 * 1000;

/** 首次安装回溯时长（毫秒），避免首启拉取过多系统事件 */
export const FIRST_INSTALL_RECONCILE_LOOKBACK_MS = 4 * 60 * 60 * 1000;

/** 对账时间重叠（毫秒），避免边界事件遗漏 */
export const RECONCILE_OVERLAP_MS = 60_000;

/** 日记列表每页加载会话数 */
export const DIARY_PAGE_SIZE = 30;

/** 日记会话卡片折叠态预估高度（用于 scrollToIndex 兜底） */
export const DIARY_SESSION_ITEM_ESTIMATED_HEIGHT = 96;

/** 小时统计中视为「长时间停留」的连续前台时长（毫秒） */
export const LONG_DWELL_THRESHOLD_MS = 5 * 60_000;

/** 不健康行为最短持续时长（毫秒） */
export const UNHEALTHY_BEHAVIOR_MIN_DURATION_MS = 2 * 60_000;

/** 上下文媒体片段最短展示时长（毫秒） */
export const CONTEXT_MEDIA_MIN_SEGMENT_MS = 60_000;

/** 媒体片段归属某运动上下文的占比阈值（0-1） */
export const CONTEXT_MEDIA_COVERAGE_THRESHOLD = 0.5;

/** 片段内上下文占比阈值（0-1） */
export const CONTEXT_COVERAGE_THRESHOLD = 0.7;

/** 相邻同类不健康行为片段合并间隔（毫秒） */
export const UNHEALTHY_BEHAVIOR_MERGE_GAP_MS = 30_000;

/** 行走场景排除的 App 分类 */
export const WALKING_USAGE_EXCLUDED_CATEGORIES = ['navigation'] as const;

/** 行走不健康行为洞察最低时长（毫秒） */
export const WALKING_INSIGHT_MIN_DURATION_MS = 3 * 60_000;

/** 躺卧不健康行为洞察最低时长（毫秒） */
export const LYING_INSIGHT_MIN_DURATION_MS = 5 * 60_000;

/** 心流会话最短持续时长（毫秒） */
export const FLOW_MIN_DURATION_MS = 10 * 60_000;

/** 游离判定：快速切换时间窗口（毫秒） */
export const WANDERING_WINDOW_MS = 3 * 60_000;

/** 游离判定：窗口内最少切换次数（超过此值视为游离） */
export const WANDERING_MIN_SWITCHES = 3;

/** 相邻游离会话合并为折叠包的最大间隔（毫秒） */
export const WANDERING_BUNDLE_GAP_MS = 15 * 60_000;

/** 游离娱乐刷屏：短会话上限（毫秒） */
export const WANDERING_SHORT_SESSION_MS = 5 * 60_000;

/** 小时格显示高切换密度的阈值 */
export const HIGH_HOURLY_SWITCH_THRESHOLD = 3;

/** 胶囊抖动边框动效的最低切换次数 */
export const WANDERING_SHAKE_SWITCH_THRESHOLD = 6;

/** 跨日重复路径判定的最短 App 路径长度 */
export const WANDERING_REPEAT_MIN_PATH_LENGTH = 3;
