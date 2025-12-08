'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';
import { authClient } from '~/server/better-auth/client';
import { Card, CardContent } from './ui/card';
import { Spinner } from './ui/spinner';

const formSchema = z.object({
  email: z.string().email('E-posta adresi geçersiz'),
  password: z.string().min(8, 'Parola en az 8 karakter olmalı'),
});

interface Login1Props {
  heading?: string;
  buttonText?: string;
}

const Login1 = ({ heading = 'Giriş', buttonText = 'Devam' }: Login1Props) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm({
    resolver: zodResolver(formSchema),
  });
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  const sendVerification = async (email: string) => {
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: '/panel/dashboard',
    });

    if (error) {
      setErrorMessage(error.message ?? 'E-posta gönderilemedi');
    } else {
      setVerificationSent(true);
      setErrorMessage('');
    }
  };

  const handleResendVerification = async () => {
    const email = getValues('email');
    if (!email) return;

    setResendingEmail(true);
    await sendVerification(email);
    setResendingEmail(false);
  };

  const onSubmit = async (values: { email: string; password: string }) => {
    setPending(true);
    setVerificationSent(false);

    const { error } = await authClient.signIn.email(
      {
        email: values.email,
        password: values.password,
        callbackURL: '/panel/dashboard',
      },
      {
        onError: async (ctx) => {
          // Handle email verification required error (403)
          if (ctx.error.status === 403) {
            await sendVerification(values.email);
            return;
          }
        },
      },
    );

    if (error?.message && !verificationSent) {
      setErrorMessage(error.message);
    }

    setPending(false);
  };

  return (
    <section className="h-screen">
      <div className="flex h-full items-center justify-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-6 lg:justify-start">
          <div className="flex w-full min-w-sm max-w-sm flex-col items-center gap-y-4 rounded-xl border border-muted bg-background px-6 py-8 shadow-md">
            {heading && <h1 className="font-semibold text-xl">{heading}</h1>}
            {verificationSent && (
              <Card className="border-amber-500/60 bg-amber-950/20 px-5 py-3 text-sm">
                <CardContent className="space-y-3">
                  <p className="text-amber-700 dark:text-amber-400">
                    E-posta adresinizi doğrulamanız gerekiyor. Gelen kutunuzu
                    kontrol edin.
                  </p>
                  <Button
                    className="w-full cursor-pointer"
                    disabled={resendingEmail}
                    onClick={handleResendVerification}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {resendingEmail ? (
                      <>
                        <Spinner />
                        Gönderiliyor...
                      </>
                    ) : (
                      'Doğrulama E-postasını Tekrar Gönder'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
            {errorMessage && !verificationSent && (
              <Card className="border-red-500/60 px-5 py-3 text-sm">
                <CardContent>
                  <span className="text-red-400">{errorMessage}</span>
                </CardContent>
              </Card>
            )}
            <form className="contents" onSubmit={handleSubmit(onSubmit)}>
              <div className="w-full space-y-1">
                <Input
                  className={cn(
                    'rounded-lg',
                    'text-sm',
                    errors.email && 'border-destructive',
                  )}
                  disabled={pending}
                  placeholder="E-posta"
                  type="email"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-destructive text-sm">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="w-full space-y-1">
                <Input
                  className={cn(
                    'rounded-lg',
                    'text-sm',
                    errors.password && 'border-destructive',
                  )}
                  disabled={pending}
                  placeholder="Parola"
                  type="password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-destructive text-sm">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <Button
                className="w-full cursor-pointer rounded-lg"
                disabled={pending}
                type="submit"
              >
                {pending && <Spinner />}
                {pending ? 'Giriş yapılıyor...' : buttonText}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Login1 };
