import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { addDays, getTodayDateString, isFutureDate } from '../utils/dateUtils';

interface DateContextValue {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  goPrevDay: () => void;
  goNextDay: () => void;
  goToday: () => void;
  canGoNext: boolean;
  isSelectedToday: boolean;
}

const DateContext = createContext<DateContextValue | null>(null);

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDateState] = useState(getTodayDateString());

  const setSelectedDate = useCallback((date: string) => {
    if (isFutureDate(date)) {
      return;
    }
    setSelectedDateState(date);
  }, []);

  const goPrevDay = useCallback(() => {
    setSelectedDateState((current) => addDays(current, -1));
  }, []);

  const goNextDay = useCallback(() => {
    setSelectedDateState((current) => {
      const next = addDays(current, 1);
      return isFutureDate(next) ? current : next;
    });
  }, []);

  const goToday = useCallback(() => {
    setSelectedDateState(getTodayDateString());
  }, []);

  const value = useMemo(
    () => ({
      selectedDate,
      setSelectedDate,
      goPrevDay,
      goNextDay,
      goToday,
      canGoNext: !isFutureDate(addDays(selectedDate, 1)),
      isSelectedToday: selectedDate === getTodayDateString(),
    }),
    [selectedDate, setSelectedDate, goPrevDay, goNextDay, goToday],
  );

  return <DateContext.Provider value={value}>{children}</DateContext.Provider>;
}

export function useSelectedDate(): DateContextValue {
  const context = useContext(DateContext);
  if (!context) {
    throw new Error('useSelectedDate 必须在 DateProvider 内使用');
  }
  return context;
}
