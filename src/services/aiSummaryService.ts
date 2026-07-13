import type { AiConfig } from '../db/settingsRepository';
import type { DayInsights } from '../analysis/insightEngine';
import type { BehaviorEvent } from '../types/event';
import { buildBehaviorProfile } from '../analysis/behaviorProfileAnalyzer';
import {
  buildDailyPromptPayload,
  DAILY_SYSTEM_PROMPT,
  MONTHLY_SYSTEM_PROMPT,
  PODCAST_WEEKLY_SYSTEM_PROMPT,
  PODCAST_MONTHLY_SYSTEM_PROMPT,
  WEEKLY_SYSTEM_PROMPT,
  buildPodcastWeeklyPromptPayload,
  buildPodcastMonthlyPromptPayload,
  ENTERTAINMENT_WEEKLY_SYSTEM_PROMPT,
  ENTERTAINMENT_MONTHLY_SYSTEM_PROMPT,
  buildEntertainmentWeeklyPromptPayload,
  buildEntertainmentMonthlyPromptPayload,
} from '../analysis/promptBuilder';
import type { PodcastReport } from '../analysis/podcastReportAnalyzer';
import type { EntertainmentReport } from '../analysis/entertainmentReportAnalyzer';
import {
  buildMonthlyPromptPayload,
  buildMonthlyReport,
  type MonthlyReport,
} from '../analysis/monthlyReportAnalyzer';
import {
  buildWeeklyPromptPayload,
  buildWeeklyReport,
  type WeeklyReport,
} from '../analysis/weeklyReportAnalyzer';

const DAILY_MAX_TOKENS = 1200;
const WEEKLY_MAX_TOKENS = 1200;
const MONTHLY_MAX_TOKENS = 1400;
/** 播客/娱乐专题解读：payload 已压缩，输出限 220-300 字，预算留足推理模型 reasoning 余量 */
const TOPIC_WEEKLY_MAX_TOKENS = 1200;
const TOPIC_MONTHLY_MAX_TOKENS = 1500;

const REASONING_MODEL_PATTERN = /^(o[13](-mini)?|deepseek-r|qwq|qvq|reasoner)/i;

interface ContentPart {
  type?: string;
  text?: string;
}

interface ChatCompletionMessage {
  content?: string | ContentPart[] | null;
  reasoning_content?: string | null;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: ChatCompletionMessage;
    finish_reason?: string;
  }>;
  error?: {
    message?: string;
  };
}

function isReasoningModel(model: string): boolean {
  const normalized = model.trim().toLowerCase();
  return (
    REASONING_MODEL_PATTERN.test(normalized) ||
    normalized.includes('-r1') ||
    normalized.includes('reasoner')
  );
}

function extractMessageContent(message?: ChatCompletionMessage, reasoning = false): string {
  const raw = message?.content;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed) {
      return trimmed;
    }
  } else if (Array.isArray(raw)) {
    const text = raw
      .filter((part): part is ContentPart & { text: string } => part?.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('')
      .trim();
    if (text) {
      return text;
    }
  }

  // 推理模型的 reasoning_content 是思维过程，不是最终答案，不应作为 content 返回；
  // 仅对非推理模型保留此回退（个别非标准接口会把答案放在该字段）
  if (reasoning) {
    return '';
  }
  const fallback = message?.reasoning_content?.trim();
  return fallback ?? '';
}

function buildChatRequestBody(
  config: AiConfig,
  systemPrompt: string,
  userContent: string,
  maxTokens: number,
): Record<string, unknown> {
  const reasoning = isReasoningModel(config.model);
  // 推理模型会先用 reasoning 吃掉大量 token，需要 4x 预算才能保证最终 content 产出
  const tokenBudget = reasoning ? Math.round(maxTokens * 4) : maxTokens;

  const body: Record<string, unknown> = {
    model: config.model,
    max_tokens: tokenBudget,
  };

  if (reasoning) {
    body.max_completion_tokens = tokenBudget;
    body.messages = [{ role: 'user', content: `${systemPrompt}\n\n${userContent}` }];
  } else {
    body.temperature = 0.7;
    body.messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];
  }

  return body;
}

async function callChatCompletion(
  config: AiConfig,
  systemPrompt: string,
  userContent: string,
  maxTokens = DAILY_MAX_TOKENS,
  allowRetry = true,
): Promise<string> {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const reasoning = isReasoningModel(config.model);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(buildChatRequestBody(config, systemPrompt, userContent, maxTokens)),
  });

  let data: ChatCompletionResponse;
  try {
    data = (await response.json()) as ChatCompletionResponse;
  } catch {
    throw new Error(`API 返回非 JSON 响应（${response.status}）`);
  }

  if (!response.ok) {
    throw new Error(data.error?.message ?? `API 请求失败（${response.status}）`);
  }

  const choice = data.choices?.[0];
  const finishReason = choice?.finish_reason ?? 'unknown';
  const content = extractMessageContent(choice?.message, reasoning);
  const hasReasoning = Boolean(choice?.message?.reasoning_content?.trim());

  // 推理模型 content 为空但 reasoning 非空：说明推理被截断，没产出最终答案，需要更大预算重试
  const truncatedByLength = finishReason === 'length';
  const reasoningTruncated = reasoning && !content && hasReasoning;

  if ((truncatedByLength || reasoningTruncated) && allowRetry) {
    return callChatCompletion(
      config,
      systemPrompt,
      userContent,
      Math.round(maxTokens * 2),
      false,
    );
  }

  if (!content) {
    console.warn('[AI] 空响应:', JSON.stringify({
      model: config.model,
      finishReason,
      reasoning,
      hasReasoning,
      choices: data.choices?.length ?? 0,
    }));
    throw new Error(
      `AI 返回内容为空（model: ${config.model}, finish_reason: ${finishReason}）`,
    );
  }

  return content;
}

/** 测试 API 配置是否可用 */
export async function testAiConnection(config: AiConfig): Promise<string> {
  if (!config.apiKey.trim()) {
    throw new Error('请先填写 API Key');
  }
  return callChatCompletion(
    config,
    '你是助手。',
    '请回复「连接成功」四个字，不要输出其他内容。',
    64,
    false,
  );
}

export async function generateDailyAiSummary(
  config: AiConfig,
  date: string,
  dayInsights: DayInsights,
  events: BehaviorEvent[],
  weekDateEventPairs: Array<{ date: string; events: BehaviorEvent[] }> = [],
): Promise<string> {
  if (!config.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const userContent = buildDailyPromptPayload(date, dayInsights, events, weekDateEventPairs);
  return callChatCompletion(config, DAILY_SYSTEM_PROMPT, userContent, DAILY_MAX_TOKENS);
}

export async function generateWeeklyAiSummary(
  config: AiConfig,
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
  monthDateEventPairs: Array<{ date: string; events: BehaviorEvent[] }> = [],
): Promise<{ content: string; report: WeeklyReport }> {
  if (!config.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const report = buildWeeklyReport(dateEventPairs);
  const profile = buildBehaviorProfile(monthDateEventPairs);
  const userContent = buildWeeklyPromptPayload(report, profile, dateEventPairs);
  const content = await callChatCompletion(config, WEEKLY_SYSTEM_PROMPT, userContent, WEEKLY_MAX_TOKENS);
  return { content, report };
}

export async function generateMonthlyAiSummary(
  config: AiConfig,
  monthDateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): Promise<{ content: string; report: MonthlyReport }> {
  if (!config.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  const report = buildMonthlyReport(monthDateEventPairs);
  const profile = buildBehaviorProfile(monthDateEventPairs);
  const userContent = buildMonthlyPromptPayload(report, profile, monthDateEventPairs);
  const content = await callChatCompletion(config, MONTHLY_SYSTEM_PROMPT, userContent, MONTHLY_MAX_TOKENS);
  return { content, report };
}

export async function generatePodcastWeeklyAiSummary(
  config: AiConfig,
  weekMonday: string,
  report: PodcastReport,
): Promise<string> {
  if (!config.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }
  const userContent = buildPodcastWeeklyPromptPayload(weekMonday, report);
  return callChatCompletion(config, PODCAST_WEEKLY_SYSTEM_PROMPT, userContent, TOPIC_WEEKLY_MAX_TOKENS);
}

export async function generatePodcastMonthlyAiSummary(
  config: AiConfig,
  monthAnchor: string,
  report: PodcastReport,
): Promise<string> {
  if (!config.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }
  const userContent = buildPodcastMonthlyPromptPayload(monthAnchor, report);
  return callChatCompletion(config, PODCAST_MONTHLY_SYSTEM_PROMPT, userContent, TOPIC_MONTHLY_MAX_TOKENS);
}

export async function generateEntertainmentWeeklyAiSummary(
  config: AiConfig,
  weekMonday: string,
  report: EntertainmentReport,
): Promise<string> {
  if (!config.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }
  const userContent = buildEntertainmentWeeklyPromptPayload(weekMonday, report);
  return callChatCompletion(config, ENTERTAINMENT_WEEKLY_SYSTEM_PROMPT, userContent, TOPIC_WEEKLY_MAX_TOKENS);
}

export async function generateEntertainmentMonthlyAiSummary(
  config: AiConfig,
  monthAnchor: string,
  report: EntertainmentReport,
): Promise<string> {
  if (!config.apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }
  const userContent = buildEntertainmentMonthlyPromptPayload(monthAnchor, report);
  return callChatCompletion(config, ENTERTAINMENT_MONTHLY_SYSTEM_PROMPT, userContent, TOPIC_MONTHLY_MAX_TOKENS);
}
