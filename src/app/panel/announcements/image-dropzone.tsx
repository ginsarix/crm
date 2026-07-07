'use client';

import { UploadIcon } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Spinner } from '~/components/ui/spinner';
import { cn } from '~/lib/utils';

export function ImageDropzone({
  imagePath,
  onUploaded,
}: {
  imagePath: string | null;
  onUploaded: (path: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Yalnızca görsel dosyaları yüklenebilir');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const res = await fetch('/api/uploads/announcements', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as { path?: string; error?: string };
      if (!res.ok || !data.path) {
        throw new Error(data.error ?? 'Görsel yüklenemedi');
      }
      onUploaded(data.path);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Görsel yüklenemedi',
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <button
      className={cn(
        'relative w-full overflow-hidden rounded-md border-2 border-dashed text-left transition-colors',
        dragOver ? 'border-primary bg-primary/5' : 'border-input',
        uploading && 'pointer-events-none opacity-70',
      )}
      onClick={() => fileInputRef.current?.click()}
      onDragLeave={() => setDragOver(false)}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void uploadFile(e.dataTransfer.files[0]);
      }}
      type="button"
    >
      {imagePath ? (
        <div className="relative aspect-[1.91/1] w-full bg-muted">
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="560px"
            src={imagePath}
            unoptimized
          />
          <div className="absolute right-2 bottom-2 rounded bg-black/70 px-2.5 py-1 font-medium text-white text-xs">
            Görseli değiştir
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 px-5 py-10 text-center text-muted-foreground">
          <div className="flex size-11 items-center justify-center rounded-md border bg-background text-primary">
            <UploadIcon className="size-5" />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">
              Görseli buraya sürükleyin
            </p>
            <p className="mt-0.5 text-xs">
              veya bilgisayarınızdan seçmek için tıklayın
            </p>
          </div>
          <p className="font-mono text-[10.5px] tracking-wide">
            Önerilen 1200×630px (600×315 – 2400×1260 arası) <br /> JPG, PNG,
            WEBP, GIF
          </p>
        </div>
      )}

      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70">
          <Spinner className="size-6" />
        </div>
      )}

      <input
        accept="image/*"
        className="hidden"
        onChange={(e) => void uploadFile(e.target.files?.[0])}
        ref={fileInputRef}
        type="file"
      />
    </button>
  );
}
