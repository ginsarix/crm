import type { LucideIcon } from 'lucide-react';
import {
  siAndroid,
  siApple,
  siFirefox,
  siGooglechrome,
  siLinux,
  siOpera,
  siSafari,
} from 'simple-icons';

type SimpleIconData = { title: string; hex: string; path: string };

// simple-icons doesn't ship Windows or Edge (trademark restrictions), so
// those fall back to a generic lucide icon via the `fallback` prop below.
export function getBrowserIcon(browserName?: string): SimpleIconData | null {
  const name = browserName?.toLowerCase() ?? '';
  if (name.includes('chrome') || name.includes('chromium'))
    return siGooglechrome;
  if (name.includes('firefox')) return siFirefox;
  if (name.includes('safari')) return siSafari;
  if (name.includes('opera')) return siOpera;
  return null;
}

export function getOsIcon(osName?: string): SimpleIconData | null {
  const name = osName?.toLowerCase() ?? '';
  if (name.includes('mac') || name.includes('ios')) return siApple;
  if (name.includes('android')) return siAndroid;
  if (name.includes('linux')) return siLinux;
  return null;
}

interface BrandIconProps {
  icon: SimpleIconData | null;
  fallback: LucideIcon;
  className?: string;
}

export function BrandIcon({
  icon,
  fallback: Fallback,
  className,
}: BrandIconProps) {
  if (!icon) {
    return <Fallback className={className} />;
  }
  return (
    <svg
      className={className}
      fill={`#${icon.hex}`}
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{icon.title}</title>
      <path d={icon.path} />
    </svg>
  );
}
