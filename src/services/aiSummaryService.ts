import type { AiConfig } from '../db/settingsRepository';
import type { DayInsights } from '../analysis/insightEngine';
import type { BehaviorEvent } from '../types/event';
import { buildBehaviorProfile } from '../analysis/behaviorProfileAnalyzer';
import {
  buildDailyPromptPayload,
  DAILY_SYSTEM_PROMPT,
  MONTHLY_SYSTEM_PROMPT,
  WEEKLY_SYSTEM_PROMPT,
} from '../analysis/promptBuilder';
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

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

async function callChatCompletion(
  config: AiConfig,
  systemPrompt: string,
  userContent: string,
  maxTokens = 800,
): Promise<string> {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.7,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  });

  const data = (await response.json()) as ChatCompletionResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `API 请求失败（${response.status}）`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  return content;
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
  return callChatCompletion(config, DAILY_SYSTEM_PROMPT, userContent, 800);
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
  const content = await callChatCompletion(config, WEEKLY_SYSTEM_PROMPT, userContent, 900);
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
  const content = await callChatCompletion(config, MONTHLY_SYSTEM_PROMPT, userContent, 1100);
  return { content, report };
}
