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

  const sections = markers.map((match, index) => {
    const title = match[1].trim();
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd =
      index < markers.length - 1 ? (markers[index + 1].index ?? trimmed.length) : trimmed.length;
    return {
      title,
      body: trimmed.slice(bodyStart, bodyEnd).trim(),
    };
  });

  const preambleEnd = markers[0]?.index ?? 0;
  if (preambleEnd > 0 && sections[0]) {
    const preamble = trimmed.slice(0, preambleEnd).trim();
    if (preamble) {
      sections[0] = {
        ...sections[0],
        body: sections[0].body ? `${preamble}\n${sections[0].body}` : preamble,
      };
    }
  }

  const sectionsWithBody = sections.filter((section) => section.body.length > 0);
  if (sectionsWithBody.length > 0) {
    return sectionsWithBody;
  }

  return sections.map((section) => ({
    ...section,
    body: '（本节暂无内容）',
  }));
}
