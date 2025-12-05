'use client';
import type { AuditLog, User } from 'generated/prisma';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';
import { Separator } from '~/components/ui/separator';
import {
  auditAction,
  resourceType as resourceTypeLabels,
} from '~/lib/enum-map';

type AuditLogWithUser = AuditLog & {
  user: Pick<User, 'id' | 'name' | 'email' | 'image'> | null;
};

interface ViewAuditLogDialogProps {
  auditLog: AuditLogWithUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewAuditLogDialog({
  auditLog,
  open,
  onOpenChange,
}: ViewAuditLogDialogProps) {
  const initials = auditLog.user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Denetim Kaydı Detayı</DialogTitle>
          <DialogDescription>
            {new Date(auditLog.createdAt).toLocaleString('tr-TR')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="rounded-lg border p-4">
            <Label className="mb-2 block text-muted-foreground">
              Kullanıcı
            </Label>
            {auditLog.user ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    alt={auditLog.user.name}
                    src={auditLog.user.image ?? undefined}
                  />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{auditLog.user.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {auditLog.user.email}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground italic">Sistem</p>
            )}
          </div>

          <Separator />

          {/* Action & Result */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block text-muted-foreground">İşlem</Label>
              <Badge className="text-sm" variant="outline">
                {auditAction[auditLog.action as keyof typeof auditAction] ??
                  auditLog.action}
              </Badge>
            </div>
            <div>
              <Label className="mb-2 block text-muted-foreground">Sonuç</Label>
              {auditLog.result === 'SUCCESS' ? (
                <div className="flex items-center gap-1 text-green-500">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Başarılı</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                  <span>Başarısız</span>
                </div>
              )}
            </div>
          </div>

          {/* Resource Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block text-muted-foreground">
                Kaynak Türü
              </Label>
              <p className="text-sm">
                {resourceTypeLabels[
                  auditLog.resourceType as keyof typeof resourceTypeLabels
                ] ?? auditLog.resourceType}
              </p>
            </div>
            <div>
              <Label className="mb-2 block text-muted-foreground">
                Kaynak ID
              </Label>
              <p className="font-mono text-muted-foreground text-xs">
                {auditLog.resourceId ?? '-'}
              </p>
            </div>
          </div>

          {/* Details */}
          {auditLog.details && (
            <div>
              <Label className="mb-2 block text-muted-foreground">
                Detaylar
              </Label>
              <div className="rounded-lg border bg-muted/50 p-3">
                <pre className="whitespace-pre-wrap font-mono text-xs">
                  {auditLog.details}
                </pre>
              </div>
            </div>
          )}

          {/* Error */}
          {auditLog.error && (
            <div>
              <Label className="mb-2 block text-red-500">Hata Mesajı</Label>
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <pre className="whitespace-pre-wrap font-mono text-red-500 text-xs">
                  {auditLog.error}
                </pre>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="mb-1 block text-muted-foreground">
                Kayıt ID
              </Label>
              <p className="font-mono text-muted-foreground text-xs">
                {auditLog.id}
              </p>
            </div>
            <div>
              <Label className="mb-1 block text-muted-foreground">Tarih</Label>
              <p className="text-sm">
                {new Date(auditLog.createdAt).toLocaleString('tr-TR')}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Kapat</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
