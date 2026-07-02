'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '~/trpc/react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Textarea } from './ui/textarea';

function toSubjectId(version: string, title: string): string {
  const vSlug = `v${version.replace('.', '-')}`;
  const titleSlug = title
    .toLowerCase()
    .replace(/[ıİ]/g, 'i')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[şŞ]/g, 's')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${vSlug}-${titleSlug}`;
}

type StoredVote = { vote: 'like' | 'dislike'; id: string };

interface EntryFeedbackButtonsProps {
  version: string;
  changeTitle: string;
}

export function EntryFeedbackButtons({
  version,
  changeTitle,
}: EntryFeedbackButtonsProps) {
  const subjectId = toSubjectId(version, changeTitle);
  const storageKey = `feedback-vote:${subjectId}`;

  const [stored, setStored] = useState<StoredVote | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setStored(JSON.parse(raw) as StoredVote);
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  function persist(value: StoredVote | null) {
    setStored(value);
    if (value) localStorage.setItem(storageKey, JSON.stringify(value));
    else localStorage.removeItem(storageKey);
  }

  const submitMutation = api.feedback.submit.useMutation({
    onSuccess: (result, variables) => {
      const newStored = {
        vote: variables.like ? ('like' as const) : ('dislike' as const),
        id: result.id,
      };
      persist(newStored);
      setPendingSwitch(false);
      if (variables.like) {
        toast.success('Geri bildiriminiz alındı');
      }
      // dislike toast is deferred — user might still add suggestion text
    },
    onError: () => {
      setPendingSwitch(false);
      toast.error('Geri bildirim gönderilemedi');
    },
  });

  const updateMutation = api.feedback.update.useMutation({
    onSuccess: () => {
      setPopoverOpen(false);
      setText('');
      toast.success('Öneri kaydedildi');
    },
    onError: () => {
      toast.error('Öneri gönderilemedi');
    },
  });

  const retractMutation = api.feedback.retract.useMutation({
    onSuccess: () => {
      persist(null);
      setPendingSwitch(false);
    },
    onError: () => {
      setPendingSwitch(false);
      toast.error('Geri bildirim geri alınamadı');
    },
  });

  const isPending =
    submitMutation.isPending || retractMutation.isPending || pendingSwitch;

  function submitDislike() {
    submitMutation.mutate({
      version,
      subjectType: 'version-entry',
      subjectId,
      like: false,
    });
  }

  function handleLike() {
    if (isPending) return;
    if (stored?.vote === 'like') {
      retractMutation.mutate({ id: stored.id });
      persist(null);
      toast.success('Geri bildiriminiz geri alındı');
    } else if (stored?.vote === 'dislike') {
      setPopoverOpen(false);
      setText('');
      setPendingSwitch(true);
      const oldId = stored.id;
      persist(null);
      retractMutation.mutate(
        { id: oldId },
        {
          onSuccess: () =>
            submitMutation.mutate({
              version,
              subjectType: 'version-entry',
              subjectId,
              like: true,
            }),
        },
      );
    } else {
      submitMutation.mutate({
        version,
        subjectType: 'version-entry',
        subjectId,
        like: true,
      });
    }
  }

  function handleDislikeClick() {
    if (isPending) return;
    if (stored?.vote === 'dislike') {
      // Revert: retract and close popover, no toast needed here separately
      retractMutation.mutate({ id: stored.id });
      persist(null);
      setPopoverOpen(false);
      setText('');
      toast.success('Geri bildiriminiz geri alındı');
      return;
    }
    // Open popover immediately so the user sees the suggestion field right away
    setPopoverOpen(true);
    if (stored?.vote === 'like') {
      // Switch: retract the like, then submit dislike
      setPendingSwitch(true);
      const oldId = stored.id;
      persist(null);
      retractMutation.mutate({ id: oldId }, { onSuccess: submitDislike });
    } else {
      submitDislike();
    }
  }

  function handleFeedbackSubmit() {
    if (!stored?.id || !text.trim() || updateMutation.isPending) return;
    updateMutation.mutate({ id: stored.id, feedback: text.trim() });
  }

  const vote = stored?.vote ?? null;
  // Popover submit is ready only once we have the record ID
  const feedbackSubmitReady =
    !!stored?.id && vote === 'dislike' && !!text.trim();

  return (
    <div className="flex items-center gap-0.5">
      <Button
        className={`size-6 transition-colors ${
          vote === 'like'
            ? 'text-green-500 hover:text-muted-foreground'
            : 'text-muted-foreground hover:text-green-500'
        }`}
        disabled={isPending}
        onClick={handleLike}
        size="icon"
        title={vote === 'like' ? 'Geri al' : 'Beğendim'}
        type="button"
        variant="ghost"
      >
        <ThumbsUp
          className={vote === 'like' ? 'fill-green-500' : ''}
          width={12}
        />
      </Button>

      <Popover
        onOpenChange={(open) => {
          if (!open) {
            setPopoverOpen(false);
            setText('');
            // Show deferred dislike toast when popover closes (if dislike was recorded)
            if (vote === 'dislike') toast.success('Geri bildiriminiz alındı');
          }
        }}
        open={popoverOpen}
      >
        <PopoverTrigger asChild>
          <Button
            className={`size-6 transition-colors ${
              vote === 'dislike'
                ? 'text-destructive hover:text-muted-foreground'
                : 'text-muted-foreground hover:text-destructive'
            }`}
            disabled={isPending}
            onClick={handleDislikeClick}
            size="icon"
            title={vote === 'dislike' ? 'Geri al' : 'Beğenmedim'}
            type="button"
            variant="ghost"
          >
            <ThumbsDown
              className={vote === 'dislike' ? 'fill-destructive' : ''}
              width={12}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-3">
          <p className="mb-0.5 font-medium text-[12.5px]">
            Ne geliştirebiliriz?
          </p>
          <p className="mb-2 text-[11.5px] text-muted-foreground">
            Görüşünüz kaydedildi. Öneri eklemek ister misiniz?
          </p>
          <Textarea
            className="resize-none text-[12.5px]"
            onChange={(e) => setText(e.target.value)}
            placeholder="Önerinizi yazın…"
            rows={3}
            value={text}
          />
          <div className="mt-2.5 flex justify-end gap-2">
            <Button
              className="h-7 text-[12px]"
              onClick={() => {
                setPopoverOpen(false);
                setText('');
                if (vote === 'dislike')
                  toast.success('Geri bildiriminiz alındı');
              }}
              type="button"
              variant="outline"
            >
              Atla
            </Button>
            <Button
              className="h-7 text-[12px]"
              disabled={!feedbackSubmitReady || updateMutation.isPending}
              onClick={handleFeedbackSubmit}
              type="button"
            >
              {updateMutation.isPending ? 'Gönderiliyor…' : 'Gönder'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
