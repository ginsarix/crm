'use client';

import { Layers, MehIcon, ThumbsDownIcon, ThumbsUpIcon } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { ButtonGroup } from '~/components/ui/button-group';
import { cn } from '~/lib/utils';

export default function PositiveControl({
  id,
  positive,
  setPositive,
  includeAll = false,
}: {
  id?: string;
  positive: 'negative' | 'neutral' | 'positive' | 'all';
  setPositive: (positive: 'negative' | 'neutral' | 'positive' | 'all') => void;
  includeAll?: boolean;
}) {
  const handleClick = (
    positive: 'negative' | 'neutral' | 'positive' | 'all',
  ) => {
    setPositive(positive);
  };

  return (
    <ButtonGroup id={id}>
      <Button
        aria-pressed={positive === 'negative'}
        className={cn(
          positive === 'negative' && 'bg-red-500/10 text-red-500',
          'hover:bg-red-500/20 hover:text-red-500',
        )}
        onClick={() => handleClick('negative')}
        type="button"
        variant="outline"
      >
        <ThumbsDownIcon />
        <span
          className={cn(
            'overflow-hidden transition-[max-width] duration-200 sm:max-w-24',
            positive === 'negative' ? 'max-w-24' : 'max-w-0',
          )}
        >
          Negatif
        </span>
      </Button>
      <Button
        aria-pressed={positive === 'neutral'}
        className={cn(
          positive === 'neutral' && 'bg-yellow-500/10 text-yellow-500',
          'hover:bg-yellow-500/20 hover:text-yellow-500',
        )}
        onClick={() => handleClick('neutral')}
        type="button"
        variant="outline"
      >
        <MehIcon />
        <span
          className={cn(
            'overflow-hidden transition-[max-width] duration-200 sm:max-w-24',
            positive === 'neutral' ? 'max-w-24' : 'max-w-0',
          )}
        >
          Nötr
        </span>
      </Button>
      <Button
        aria-pressed={positive === 'positive'}
        className={cn(
          positive === 'positive' && 'bg-green-500/10 text-green-500',
          'hover:bg-green-500/20 hover:text-green-500',
        )}
        onClick={() => handleClick('positive')}
        type="button"
        variant="outline"
      >
        <ThumbsUpIcon />
        <span
          className={cn(
            'overflow-hidden transition-[max-width] duration-200 sm:max-w-24',
            positive === 'positive' ? 'max-w-24' : 'max-w-0',
          )}
        >
          Pozitif
        </span>
      </Button>
      {includeAll && (
        <Button
          aria-pressed={positive === 'all'}
          className={cn(
            positive === 'all' && 'bg-cyan-500/10 text-cyan-500',
            'hover:bg-cyan-500/20 hover:text-cyan-500',
          )}
          onClick={() => handleClick('all')}
          type="button"
          variant="outline"
        >
          <Layers />
          <span
            className={cn(
              'overflow-hidden transition-[max-width] duration-200 sm:max-w-24',
              positive === 'all' ? 'max-w-24' : 'max-w-0',
            )}
          >
            Tümü
          </span>
        </Button>
      )}
    </ButtonGroup>
  );
}
