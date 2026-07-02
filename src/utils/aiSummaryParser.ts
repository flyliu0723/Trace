export interface AiSummarySection {
  title: string;
  body: string;
}

/** 解析 AI 总结中的【标题】分段 */
export function parseAiSummarySections(content: string): AiSummarySection[] {
  const trimmed = content.trim();
  if (!trimmed) {
    return [];
  }

  const markers = [...trimmed.matchAll(/【([^】]+)】/g)];
  if (markers.length === 0) {
    return [{ title: '总结', body: trimmed }];
  }

  return markers.map((match, index) => {
    const title = match[1].trim();
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd =
      index < markers.length - 1 ? (markers[index + 1].index ?? trimmed.length) : trimmed.length;
    return {
      title,
      body: trimmed.slice(bodyStart, bodyEnd).trim(),
    };
  });
}
