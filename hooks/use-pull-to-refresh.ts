import { useCallback, useState } from 'react';

type RefreshCallback = (() => Promise<void>) | (() => void) | undefined;

/**
 * Simple helper for pull-to-refresh flows.
 * Guarantees a minimum spinner duration so the gesture always feels responsive.
 */
export function usePullToRefresh(onRefresh?: RefreshCallback, minimumDurationMs = 400) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      const tasks = [
        // Ensure the indicator is visible for at least `minimumDurationMs`
        new Promise(resolve => setTimeout(resolve, minimumDurationMs)),
        Promise.resolve(onRefresh?.()),
      ];

      await Promise.all(tasks);
    } catch (error) {
      console.warn('Pull-to-refresh failed', error);
    } finally {
      setRefreshing(false);
    }
  }, [minimumDurationMs, onRefresh, refreshing]);

  return { refreshing, onRefresh: handleRefresh };
}
