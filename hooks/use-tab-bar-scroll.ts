import React from 'react';
import { DeviceEventEmitter, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

export const TAB_BAR_SCROLL_EVENT = 'TAB_BAR_SCROLL_EVENT';

/**
 * Emits tab bar visibility hints based on vertical scroll direction.
 * Attach `handleScroll` to ScrollView/FlatList onScroll with `scrollEventThrottle={16}`.
 */
export function useTabBarScroll() {
  const lastOffsetRef = React.useRef(0);

  const handleScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const diff = y - lastOffsetRef.current;

      // small moves are ignored to reduce jitter
      if (Math.abs(diff) < 8) return;

      if (diff > 0) {
        DeviceEventEmitter.emit(TAB_BAR_SCROLL_EVENT, { direction: 'up' });
      } else {
        DeviceEventEmitter.emit(TAB_BAR_SCROLL_EVENT, { direction: 'down' });
      }

      lastOffsetRef.current = y;
    },
    []
  );

  return { handleScroll };
}
