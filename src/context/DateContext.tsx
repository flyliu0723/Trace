import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { syncOnForeground } from '../services/syncCoordinator';
import { addDays, getTodayDateString, isFutureDate } from '../utils/dateUtils';

interface DateContextValue {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  goPrevDay: () => void;
  goNextDay: () => void;
  goToday: () => void;
  canGoNext: boolean;
  isSelectedToday: boolean;
  /** 前台同步完成后递增，供各页面刷新数据 */
  dataRevision: number;
  /** 手动触发各页重新拉取数据（如修改 App 分类后） */
  refreshData: () => void;
}

const DateContext = createContext<DateContextValue | null>(null);

export function DateProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDateState] = useState(getTodayDateString());
  const [dataRevision, setDataRevision] = useState(0);
  const lastCalendarDateRef = useRef(getTodayDateString());

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

  const refreshData = useCallback(() => {
    setDataRevision((revision) => revision + 1);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        return;
      }

      const today = getTodayDateString();
      const previousCalendarDate = lastCalendarDateRef.current;

      if (today !== previousCalendarDate) {
        setSelectedDateState((current) => {
          if (current === previousCalendarDate) {
            return today;
          }
          return current;
        });
      }
      lastCalendarDateRef.current = today;

      syncOnForeground()
        .then(() => setDataRevision((revision) => revision + 1))
        .catch(console.error);
    });

    return () => subscription.remove();
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
      dataRevision,
      refreshData,
    }),
    [selectedDate, setSelectedDate, goPrevDay, goNextDay, goToday, dataRevision, refreshData],
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
