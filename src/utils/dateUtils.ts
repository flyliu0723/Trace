/** 日期加减，输入输出均为 YYYY-MM-DD */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateString(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isToday(dateStr: string): boolean {
  return dateStr === getTodayDateString();
}

export function isFutureDate(dateStr: string): boolean {
  return dateStr > getTodayDateString();
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 格式化为「7月2日 周四」 */
export function formatDisplayDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAY_LABELS[date.getDay()];
  if (isToday(dateStr)) {
    return `今天 ${month}月${day}日`;
  }
  return `${month}月${day}日 ${weekday}`;
}

/** 获取指定日期所在周的周一（YYYY-MM-DD，周一为一周起始） */
export function getMondayOfWeek(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  const weekday = date.getDay();
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  return addDays(dateStr, diffToMonday);
}

/** 以周一为起点，返回连续 7 天（周一至周日） */
export function getWeekDatesMondayToSunday(weekMonday: string): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    dates.push(addDays(weekMonday, i));
  }
  return dates;
}

/** 获取指定日期所在周的周日 */
export function getSundayOfWeek(dateStr: string): string {
  return addDays(getMondayOfWeek(dateStr), 6);
}

/** 获取月初（YYYY-MM-01） */
export function getFirstDayOfMonth(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/** 获取月末（YYYY-MM-DD） */
export function getLastDayOfMonth(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const year = last.getFullYear();
  const month = String(last.getMonth() + 1).padStart(2, '0');
  const day = String(last.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 是否属于当前自然月 */
export function isCurrentMonth(dateStr: string): boolean {
  const today = getTodayDateString();
  return getFirstDayOfMonth(dateStr) === getFirstDayOfMonth(today);
}

/** 自然月内所有日期（当前月截至今天，历史月截至月末） */
export function getMonthDateStrings(dateStr: string): string[] {
  const first = getFirstDayOfMonth(dateStr);
  const last = isCurrentMonth(dateStr) ? getTodayDateString() : getLastDayOfMonth(dateStr);
  const dates: string[] = [];
  for (let current = first; current <= last; current = addDays(current, 1)) {
    dates.push(current);
  }
  return dates;
}

/** 格式化为「3月1日—3月31日」或「3月1日—今天」 */
export function formatMonthRangeLabel(dateStr: string): string {
  const first = getFirstDayOfMonth(dateStr);
  const last = isCurrentMonth(dateStr) ? getTodayDateString() : getLastDayOfMonth(dateStr);
  const fmt = (d: string) => {
    const date = new Date(`${d}T12:00:00`);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };
  const endLabel = isCurrentMonth(dateStr) && last === getTodayDateString() ? '今天' : fmt(last);
  return `${fmt(first)}—${endLabel}`;
}

/** 格式化为「3月3日—3月9日」周区间 */
export function formatWeekRangeLabel(weekMonday: string): string {
  const sunday = addDays(weekMonday, 6);
  const fmt = (d: string) => {
    const date = new Date(`${d}T12:00:00`);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };
  return `${fmt(weekMonday)}—${fmt(sunday)}`;
}

/** 判断日期是否落在以 weekMonday 为起点的自然周内 */
export function isDateInWeek(dateStr: string, weekMonday: string): boolean {
  const weekSunday = addDays(weekMonday, 6);
  return dateStr >= weekMonday && dateStr <= weekSunday;
}

/** 最近 N 天日期列表（含今天） */
export function getRecentDateStrings(days: number): string[] {
  return getDateStringsEndingAt(getTodayDateString(), days);
}

/** 以 endDate 为最后一天，向前取 N 天（含 endDate） */
export function getDateStringsEndingAt(endDate: string, days: number): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    result.push(addDays(endDate, -i));
  }
  return result;
}

/** 时间戳转 YYYY-MM-DD（本地时区） */
export function timestampToDateString(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
