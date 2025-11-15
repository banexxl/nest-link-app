/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type BuiltinCategory = 'background' | 'text';
type ColorCategory = keyof typeof Colors | BuiltinCategory;
type ColorShade = 'main' | 'light' | 'dark';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorCategory: ColorCategory = 'primary',
  colorShade: ColorShade = 'main'
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    // Handle built-in semantic categories that are theme-dependent
    if (colorCategory === 'background') {
      return theme === 'dark' ? '#000000' : '#FFFFFF';
    }
    if (colorCategory === 'text') {
      return theme === 'dark' ? '#FFFFFF' : '#111827';
    }
    // Fall back to palette categories from Colors
    return Colors[colorCategory][colorShade];
  }
}
