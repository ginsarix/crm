"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { Spinner } from "./ui/spinner";

const formSchema = z.object({
  email: z.string().email("E-posta adresi geçersiz"),
  password: z.string().min(8, "Parola en az 8 karakter olmalı"),
});

type FormData = z.infer<typeof formSchema>;

interface Login1Props {
  action: (formData: globalThis.FormData) => void;
  heading?: string;
  buttonText?: string;
}

const Login1 = ({
  action,
  heading = "Giriş",
  buttonText = "Devam",
}: Login1Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Convert validated data to FormData for server action
      const formData = new globalThis.FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);

      await action(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="h-screen">
      <div className="flex h-full items-center justify-center">
        {/* Logo */}
        <div className="flex flex-col items-center gap-6 lg:justify-start">
          <div className="flex w-full min-w-sm max-w-sm flex-col items-center gap-y-4 rounded-xl border border-muted bg-background px-6 py-8 shadow-md">
            {heading && <h1 className="font-semibold text-xl">{heading}</h1>}
            <form className="contents" onSubmit={handleSubmit(onSubmit)}>
              <div className="w-full space-y-1">
                <Input
                  className={cn(
                    "rounded-lg",
                    "text-sm",
                    errors.email && "border-destructive"
                  )}
                  placeholder="E-posta"
                  type="email"
                  {...register("email")}
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
                    "rounded-lg",
                    "text-sm",
                    errors.password && "border-destructive"
                  )}
                  placeholder="Parola"
                  type="password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-destructive text-sm">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <Button
                className="w-full cursor-pointer rounded-lg"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting && <Spinner />}
                {isSubmitting ? "Giriş yapılıyor..." : buttonText}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export { Login1 };
