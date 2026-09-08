import { env } from '~/env';

export const colorHint = {
  green: env.NEXT_PUBLIC_COLOR_HINT_GREEN,
  blue: env.NEXT_PUBLIC_COLOR_HINT_BLUE,
  orange: env.NEXT_PUBLIC_COLOR_HINT_ORANGE,
  yellow: env.NEXT_PUBLIC_COLOR_HINT_YELLOW,
  purple: env.NEXT_PUBLIC_COLOR_HINT_PURPLE,
  gray: env.NEXT_PUBLIC_COLOR_HINT_GRAY,
} as const;
