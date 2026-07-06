import type { DayInsights } from './insightEngine';
import type { EntertainmentReport } from './entertainmentReportAnalyzer';
import {
  formatEntertainmentMonthlyPayload,
  formatEntertainmentWeeklyPayload,
} from './entertainmentReportAnalyzer';
import type { PodcastReport } from './podcastReportAnalyzer';
import {
  formatPodcastMonthlyPayload,
  formatPodcastWeeklyPayload,
} from './podcastReportAnalyzer';
import type { BehaviorEvent } from '../types/event';
import { addDays, formatDisplayDate } from '../utils/dateUtils';
import { analyzeBehaviorAnomalies, formatBehaviorAnomalies } from './anomalyAnalyzer';
import { analyzeDailyComparison, formatDailyComparisonReport } from './comparativeAnalyzer';
import { compareDayPaths, formatDayPathComparison } from './dayComparisonAnalyzer';
import { buildContextMediaInsight } from './contextMediaAnalyzer';
import { analyzeDailyMediaScenes, formatDailyMediaSceneReport } from './mediaSceneAnalyzer';
import {
  analyzeUnhealthyBehaviors,
  formatUnhealthyBehaviorReport,
} from './unhealthyBehaviorAnalyzer';
import { getGoalTypeLabel, type SessionGoal } from './sessionGoalAnalyzer';
import { analyzeSwitchChains, formatSwitchChains } from './switchChainAnalyzer';
import { formatTime } from './sessionAnalyzer';

const FOCUS_GOAL_TYPES = new Set<SessionGoal['goalType']>(['productive', 'passive_media']);
const DISTRACTION_GOAL_TYPES = new Set<SessionGoal['goalType']>([
  'quick_glance',
  'entertainment',
  'idle',
]);

function formatSessionLines(goals: SessionGoal[], limit = 10): string {
  return goals
    .slice(0, limit)
    .map((g) => `- ${formatTime(g.startTime)} [${getGoalTypeLabel(g.goalType)}] ${g.summary}`)
    .join('\n');
}

/** 构建 AI 日报 prompt 的用户消息内容 */
export function buildDailyPromptPayload(
  date: string,
  dayInsights: DayInsights,
  events: BehaviorEvent[],
  weekDateEventPairs: Array<{ date: string; events: BehaviorEvent[] }> = [],
): string {
  const { goalSummary } = dayInsights;
  const insightLines = dayInsights.insights.map((i) => `- ${i.title}：${i.description}`).join('\n');

  const triggerLines = dayInsights.triggers
    .slice(0, 5)
    .map((t) => `- ${t.fromLabel} → ${t.toLabel}：${t.count}次，占${t.percentage}%`)
    .join('\n');

  const patternLines = dayInsights.patterns
    .map((p) => `- ${p.pathLabel}：${p.occurrenceDays}天出现，共${p.totalCount}次`)
    .join('\n');

  const focusSessions = dayInsights.sessionGoals.filter((g) => FOCUS_GOAL_TYPES.has(g.goalType));
  const distractionSessions = dayInsights.sessionGoals.filter((g) =>
    DISTRACTION_GOAL_TYPES.has(g.goalType),
  );

  const focusLines = formatSessionLines(focusSessions, 8);
  const distractionLines = formatSessionLines(distractionSessions, 8);

  const comparisonReport = analyzeDailyComparison(date, weekDateEventPairs);
  const comparisonSection = comparisonReport
    ? formatDailyComparisonReport(comparisonReport)
    : '## 相比过去几天\n暂无足够历史数据';

  const anomalySection = formatBehaviorAnomalies(
    analyzeBehaviorAnomalies(date, weekDateEventPairs),
  );

  const yesterdayDate = addDays(date, -1);
  const yesterdayEvents =
    weekDateEventPairs.find((pair) => pair.date === yesterdayDate)?.events ?? [];
  const dayComparison = compareDayPaths(events, yesterdayEvents);
  const dayComparisonSection = dayComparison ? formatDayPathComparison(dayComparison) : '暂无';

  const switchChainSection = formatSwitchChains(analyzeSwitchChains(events));

  const mediaSceneReport = analyzeDailyMediaScenes(events);
  const mediaSceneSection = mediaSceneReport
    ? formatDailyMediaSceneReport(mediaSceneReport)
    : '今日无显著后台播客/音乐播放';

  const contextMediaInsight = dayInsights.contextMedia
    ? buildContextMediaInsight(dayInsights.contextMedia)
    : null;
  const contextMediaSection = contextMediaInsight?.description ?? '今日无行进/步行伴随收听';

  const unhealthyBehaviorReport = analyzeUnhealthyBehaviors(events);
  const unhealthyBehaviorSection = formatUnhealthyBehaviorReport(unhealthyBehaviorReport);

  return `日期：${formatDisplayDate(date)}（${date}）

## 今日会话概览
- 完成任务型会话：${goalSummary.productiveCount} 次（共 ${goalSummary.totalTasks} 项事务）
- 娱乐浏览：${goalSummary.entertainmentCount} 次
- 快速查看：${goalSummary.quickGlanceCount} 次

${comparisonSection}

## 异常信号
${anomalySection}

## 与昨天对比
${dayComparisonSection}

## 规则引擎洞察
${insightLines || '暂无'}

## App 跳转触发器（请重点解释这些路径出现的场景和可能原因）
${triggerLines || '暂无'}

## 重复行为路径（近7天）
${patternLines || '暂无'}

## 专注/高效会话
${focusLines || '暂无'}

## 干扰/快速查看会话
${distractionLines || '暂无'}

## 后台媒体场景
${mediaSceneSection}

## 伴随式收听（行进/步行/后台）
${contextMediaSection}

## 场景行为（行走/躺卧使用手机）
${unhealthyBehaviorSection}

## 连续切换链
${switchChainSection}`;
}

export const DAILY_SYSTEM_PROMPT = `你是 SpendWhere 的数字行为分析师。用户的数据来自手机行为时间线，不是屏幕时长统计。

你的任务不是复述数据，而是帮助用户发现自己没意识到的行为规律，并给出明天可验证的小实验。

输出必须严格按以下四个部分，用【】标记标题，每部分 1-3 句：
【今日发现】今天最值得注意的一件事或行为模式；优先使用「异常信号」「相比过去几天」「与昨天对比」中的信息
【为什么会这样】结合跳转路径、时间段、连续切换链、后台媒体场景、会话分析解释原因；对高频跳转说明它通常出现在什么场景、是否像固定放松或打断模式
【今天做得好】今天已有的良好习惯或专注时段；若无明显亮点，诚实说明
【明天小实验】一个基于今日数据、成本极低、明天可观察结果的小调整；禁止空泛建议如「少刷手机」

写作规则：
- 全文 450 字以内，简体中文
- 温暖、不评判，不要说教、不要批评
- 区分「主动操作」和「后台播客/音乐陪伴」
- 若提供「场景行为」数据，可描述行走或躺卧时使用屏幕的情况，但不要做医学判断
- 每条结论必须基于提供的数据，禁止猜测不存在的事实
- 禁止推测情绪、压力、心情
- 不要重复统计数字，不要逐条复述输入数据
- 每一段都必须包含新的观察，优先解释「为什么」而非罗列「发生了什么」
- 若没有明显规律，明确说明样本不足或未发现模式，不要编造`;

export const WEEKLY_SYSTEM_PROMPT = `你是 SpendWhere 的数字行为分析师。请根据用户过去一周的行为统计数据写周报，不是简单汇总数字。

输出必须严格按以下四个部分，用【】标记标题，每部分 1-3 句：
【本周发现】本周最值得关注的一个规律、趋势或变化；优先使用「周中趋势」「本周与长期画像的差异」中的信息
【为什么会这样】结合热门跳转路径、重复行为路径、长期画像解释背后的模式
【本周亮点】值得继续的良好习惯或使用方式；若无明显亮点，诚实说明
【下周小实验】一个基于本周数据、成本极低、下周可观察结果的小调整；禁止空泛建议

写作规则：
- 全文 500 字以内，简体中文
- 温暖、不评判，不要说教、不要批评
- 每条结论必须基于提供的数据，禁止猜测不存在的事实
- 禁止推测情绪、压力、心情
- 不要重复统计数字，不要逐条复述输入数据
- 每一段都必须包含新的观察，优先解释「为什么」而非罗列「发生了什么」
- 若没有明显规律，明确说明，不要编造`;

export const MONTHLY_SYSTEM_PROMPT = `你是 SpendWhere 的数字行为分析师。请根据用户过去一个月的行为统计数据写月报，不是简单汇总数字。

输出必须严格按以下四个部分，用【】标记标题，每部分 2-4 句：
【本月发现】本月最值得关注的一个规律、趋势或变化；优先使用「月内趋势」「月内前后半段差异」中的信息
【为什么会这样】结合热门跳转路径、重复行为路径、媒体场景习惯、长期画像解释背后的模式
【本月亮点】值得继续的良好习惯或使用方式；若无明显亮点，诚实说明
【下月小实验】一个基于本月数据、成本极低、下月可观察结果的小调整；禁止空泛建议

写作规则：
- 全文 600 字以内，简体中文
- 温暖、不评判，不要说教、不要批评
- 每条结论必须基于提供的数据，禁止猜测不存在的事实
- 禁止推测情绪、压力、心情
- 不要重复统计数字，不要逐条复述输入数据
- 每一段都必须包含新的观察，优先解释「为什么」而非罗列「发生了什么」
- 若没有明显规律，明确说明，不要编造`;

export const PODCAST_WEEKLY_SYSTEM_PROMPT = `你是 SpendWhere 的播客/音乐收听分析师。用户数据来自手机行为时间线，统计区间为自然周（周一至周日）。

输出必须严格按以下四个部分，用【】标记标题，每部分 1-3 句：
【收听画像】本周最值得注意的收听模式（时段、场景、App、节目类型）
【为什么会这样】结合行进/步行/陪伴场景、逐日分布、较上周变化解释；区分「主动打开」与「锁屏后台陪伴」
【听得好的地方】值得保留的收听习惯；若无则诚实说明
【下周小实验】一个成本极低、可观察的收听相关小调整

写作规则：全文 350 字以内，简体中文，温暖不评判，不逐条复述数字`;

export const PODCAST_MONTHLY_SYSTEM_PROMPT = `你是 SpendWhere 的播客/音乐收听分析师。用户数据来自手机行为时间线，统计区间为自然月（1 日至月底）。

输出必须严格按以下四个部分，用【】标记标题，每部分 2-4 句：
【收听画像】本月最值得注意的收听模式与变化
【为什么会这样】结合场景习惯、逐日分布、较上月变化解释收听节奏
【听得好的地方】值得保留的收听习惯；若无则诚实说明
【下月小实验】一个成本极低、可观察的收听相关小调整

写作规则：全文 450 字以内，简体中文，温暖不评判，不逐条复述数字`;

export function buildPodcastWeeklyPromptPayload(
  weekMonday: string,
  report: PodcastReport,
): string {
  return formatPodcastWeeklyPayload(weekMonday, report);
}

export function buildPodcastMonthlyPromptPayload(
  monthAnchor: string,
  report: PodcastReport,
): string {
  return formatPodcastMonthlyPayload(monthAnchor, report);
}

export const ENTERTAINMENT_WEEKLY_SYSTEM_PROMPT = `你是 SpendWhere 的娱乐浏览分析师。统计区间为自然周（周一至周日），覆盖抖音、小红书、B站等。

输出必须严格按以下四个部分，用【】标记标题，每部分 1-3 句：
【刷屏画像】本周最突出的娱乐浏览模式（App、时段、是否碎片化）
【为什么会这样】结合跳转路径、游离会话、逐日分布、较上周变化解释
【没那么糟的地方】可接受的娱乐方式；若无则诚实说明
【下周小实验】一个成本极低的浏览相关小调整

写作规则：全文 350 字以内，简体中文，温暖不评判，不逐条复述数字`;

export const ENTERTAINMENT_MONTHLY_SYSTEM_PROMPT = `你是 SpendWhere 的娱乐浏览分析师。统计区间为自然月（1 日至月底）。

输出必须严格按以下四个部分，用【】标记标题，每部分 2-4 句：
【刷屏画像】本月最突出的娱乐浏览模式与趋势
【为什么会这样】结合高频跳转、游离刷屏、逐日分布、较上月变化解释
【没那么糟的地方】可接受的娱乐方式；若无则诚实说明
【下月小实验】一个成本极低的浏览相关小调整

写作规则：全文 450 字以内，简体中文，温暖不评判，不逐条复述数字`;

export function buildEntertainmentWeeklyPromptPayload(
  weekMonday: string,
  report: EntertainmentReport,
): string {
  return formatEntertainmentWeeklyPayload(weekMonday, report);
}

export function buildEntertainmentMonthlyPromptPayload(
  monthAnchor: string,
  report: EntertainmentReport,
): string {
  return formatEntertainmentMonthlyPayload(monthAnchor, report);
}
