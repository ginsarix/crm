'use client';

import { MessageSquarePlus, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { APP_VERSION } from '~/constants/app-version';
import { api } from '~/trpc/react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

export function HeaderFeedbackButton() {
  const [open, setOpen] = useState(false);
  const [like, setLike] = useState<boolean | null>(null);
  const [text, setText] = useState('');

  const mutation = api.feedback.submit.useMutation({
    onSuccess: () => {
      toast.success('Geri bildiriminiz alındı, teşekkürler!');
      setOpen(false);
      setLike(null);
      setText('');
    },
    onError: () => {
      toast.error('Geri bildirim gönderilemedi');
    },
  });

  function handleSubmit() {
    mutation.mutate({
      version: APP_VERSION,
      feedback: text.trim() || undefined,
      like: like ?? undefined,
    });
  }

  const isEmpty = !text.trim() && like === null;

  return (
    <>
      <Button
        className="size-8 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
        size="icon"
        title="Geri Bildirim"
        type="button"
        variant="ghost"
      >
        <MessageSquarePlus width={15} />
      </Button>

      <Dialog
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setLike(null);
            setText('');
          }
        }}
        open={open}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Geri Bildirim</DialogTitle>
            <DialogDescription>
              Uygulama hakkındaki düşüncelerinizi bizimle paylaşın.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-1">
            <div className="flex flex-col gap-2">
              <Label className="text-[12.5px] text-muted-foreground">
                Genel deneyiminiz
              </Label>
              <div className="flex gap-2">
                <button
                  className={`flex items-center gap-1.5 rounded border px-3 py-2 text-[12.5px] transition-colors ${
                    like === true
                      ? 'border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'border-border text-muted-foreground hover:border-green-500/30 hover:bg-green-500/5 hover:text-foreground'
                  }`}
                  onClick={() => setLike(like === true ? null : true)}
                  type="button"
                >
                  <ThumbsUp
                    className={like === true ? 'fill-green-500' : ''}
                    width={13}
                  />
                  Beğendim
                </button>
                <button
                  className={`flex items-center gap-1.5 rounded border px-3 py-2 text-[12.5px] transition-colors ${
                    like === false
                      ? 'border-destructive/40 bg-destructive/10 text-destructive'
                      : 'border-border text-muted-foreground hover:border-destructive/30 hover:bg-destructive/5 hover:text-foreground'
                  }`}
                  onClick={() => setLike(like === false ? null : false)}
                  type="button"
                >
                  <ThumbsDown
                    className={like === false ? 'fill-destructive' : ''}
                    width={13}
                  />
                  Beğenmedim
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label
                className="text-[12.5px] text-muted-foreground"
                htmlFor="feedback-text"
              >
                Yorumunuz{' '}
                <span className="text-muted-foreground/60">(isteğe bağlı)</span>
              </Label>
              <Textarea
                id="feedback-text"
                onChange={(e) => setText(e.target.value)}
                placeholder="Neler daha iyi olabilir? Hangi özelliği ekleyelim?"
                rows={4}
                value={text}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setOpen(false)}
              type="button"
              variant="outline"
            >
              İptal
            </Button>
            <Button
              disabled={isEmpty || mutation.isPending}
              onClick={handleSubmit}
              type="button"
            >
              {mutation.isPending ? 'Gönderiliyor…' : 'Gönder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
