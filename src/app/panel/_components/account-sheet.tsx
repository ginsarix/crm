'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import { Skeleton } from '~/components/ui/skeleton';
import { api } from '~/trpc/react';
import { AccountBusinessGroupsList } from './account-business-groups-list';
import { AccountCustomerCardsList } from './account-customer-cards-list';
import { AccountPasswordForm } from './account-password-form';
import { AccountProfileForm } from './account-profile-form';
import { AccountSessions } from './account-sessions';
import { AccountVisitsList } from './account-visits-list';

type View = 'overview' | 'customer-cards' | 'visits' | 'business-groups';

interface AccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountSheet({ open, onOpenChange }: AccountSheetProps) {
  const [view, setView] = useState<View>('overview');
  const { data: account, isLoading } = api.user.getMyAccount.useQuery(
    undefined,
    { enabled: open },
  );

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setTimeout(() => setView('overview'), 300);
    }
  };

  const initials = account?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b">
          <SheetTitle>Hesap Ayarları</SheetTitle>
          <SheetDescription>
            Profil bilgilerinizi, şifrenizi ve etkinliğinizi yönetin
          </SheetDescription>
        </SheetHeader>

        {view === 'overview' && (
          <div className="fade-in slide-in-from-left-2 animate-in space-y-6 p-6 duration-300">
            {isLoading || !account ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-12 rounded-md" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Avatar className="size-12 rounded-md">
                    <AvatarFallback className="rounded-md bg-sidebar-primary font-mono font-semibold text-sidebar-primary-foreground">
                      {initials ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{account.name}</p>
                    <p className="truncate text-muted-foreground text-sm">
                      {account.email}
                    </p>
                  </div>
                  <Badge className="ml-auto" variant="secondary">
                    {account.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Katılma Tarihi
                    </p>
                    <p className="font-medium text-sm">
                      {new Date(account.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Oluşturduğu Cari Kartlar
                    </p>
                    <Button
                      asChild
                      className="h-auto p-0 font-medium text-sm"
                      variant="link"
                    >
                      {/* biome-ignore lint/a11y/useValidAnchor: placeholder link, will route to customer card records later */}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setView('customer-cards');
                        }}
                      >
                        {account._count.createdCustomerCards} kart →
                      </a>
                    </Button>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Oluşturduğu Ziyaretler
                    </p>
                    <Button
                      asChild
                      className="h-auto p-0 font-medium text-sm"
                      variant="link"
                    >
                      {/* biome-ignore lint/a11y/useValidAnchor: placeholder link, will route to visit records later */}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setView('visits');
                        }}
                      >
                        {account._count.createdVisits} ziyaret →
                      </a>
                    </Button>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">
                      Atanmış Meslek Grupları
                    </p>
                    <Button
                      asChild
                      className="h-auto p-0 font-medium text-sm"
                      variant="link"
                    >
                      {/* biome-ignore lint/a11y/useValidAnchor: placeholder link, opens the business groups sub-view */}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setView('business-groups');
                        }}
                      >
                        {account.assignedBusinessGroups.length} grup →
                      </a>
                    </Button>
                  </div>
                </div>

                <Separator />
                <AccountProfileForm name={account.name} />
                <Separator />
                <AccountPasswordForm />
                <Separator />
                <AccountSessions />
              </>
            )}
          </div>
        )}

        {view === 'customer-cards' && (
          <div className="fade-in slide-in-from-right-2 animate-in p-6 duration-300">
            <AccountCustomerCardsList
              onBack={() => setView('overview')}
              onNavigate={() => handleOpenChange(false)}
            />
          </div>
        )}

        {view === 'visits' && (
          <div className="fade-in slide-in-from-right-2 animate-in p-6 duration-300">
            <AccountVisitsList
              onBack={() => setView('overview')}
              onNavigate={() => handleOpenChange(false)}
            />
          </div>
        )}

        {view === 'business-groups' && account && (
          <div className="fade-in slide-in-from-right-2 animate-in p-6 duration-300">
            <AccountBusinessGroupsList
              businessGroups={account.assignedBusinessGroups}
              onBack={() => setView('overview')}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
