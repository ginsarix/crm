import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { DatePicker } from "~/app/_components/date-picker";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { VisitCreateSchema } from "~/shared/zod-schemas/visit";
import { api } from "~/trpc/react";

const VIA_OPTIONS = [
  { value: "phone", label: "Telefon" },
  { value: "inPerson", label: "Yüzyüze" },
  { value: "email", label: "E-Posta" },
  { value: "sms", label: "SMS" },
] as const;

export function CreateVisitDialog() {
  const [open, setOpen] = useState(false);
  const utils = api.useUtils();

  // Fetch all customer cards for the dropdown
  const { data: customerCardsData } = api.customerCard.get.useQuery({});

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(VisitCreateSchema),
    mode: "onChange",
    defaultValues: {
      via: undefined,
    },
    shouldFocusError: false,
  });

  const createMutation = api.visit.create.useMutation({
    onSuccess: () => {
      utils.visit.get.invalidate();
    },
  });

  const onSubmit = async (data: z.infer<typeof VisitCreateSchema>) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success("Ziyaret başarıyla eklendi");
      reset();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Ziyaret eklenirken bir hata oluştu");
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer" size="icon">
          <PlusIcon />
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby="Ziyaret ekleme formu"
        className="max-h-[99vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Ziyaret Ekle</DialogTitle>
          <DialogDescription>Müşteri ziyaret kaydı oluşturun</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {/* Customer Card Selection */}
          <div className="space-y-2">
            <Label htmlFor="customerCardId">Müşteri Kartı *</Label>
            <Controller
              control={control}
              name="customerCardId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger
                    className={errors.customerCardId ? "border-red-500" : ""}
                    id="customerCardId"
                  >
                    <SelectValue placeholder="Müşteri seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {customerCardsData?.data?.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name} - {card.gsm1 || "GSM Yok"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.customerCardId && (
              <p className="text-red-500 text-sm">
                {errors.customerCardId.message}
              </p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Tarih *</Label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <DatePicker
                    className={errors.date ? "border-red-500" : ""}
                    id="date"
                    onChange={(date) => {
                      field.onChange(date);
                    }}
                    value={field.value}
                  />
                )}
              />
              {errors.date && (
                <p className="text-red-500 text-sm">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Saat</Label>
              <Controller
                control={control}
                name="time"
                render={({ field }) => (
                  <Input
                    className={errors.time ? "border-red-500" : ""}
                    id="time"
                    onChange={(e) => {
                      const timeValue = e.target.value;
                      if (timeValue) {
                        // Create a UTC date with the selected time to avoid timezone conversion
                        const [hours, minutes] = timeValue.split(":");
                        const date = new Date();
                        date.setUTCHours(
                          parseInt(hours ?? "0", 10),
                          parseInt(minutes ?? "0", 10),
                          0,
                          0
                        );
                        field.onChange(date);
                      }
                    }}
                    type="time"
                    value={
                      field.value
                        ? `${String(
                            new Date(field.value).getUTCHours()
                          ).padStart(2, "0")}:${String(
                            new Date(field.value).getUTCMinutes()
                          ).padStart(2, "0")}`
                        : ""
                    }
                  />
                )}
              />
              {errors.time && (
                <p className="text-red-500 text-sm">{errors.time.message}</p>
              )}
            </div>
          </div>

          {/* Via */}
          <div className="space-y-2">
            <Label htmlFor="via">İletişim Türü</Label>
            <Controller
              control={control}
              name="via"
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? undefined}
                >
                  <SelectTrigger className="w-full" id="via">
                    <SelectValue placeholder="İletişim türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {VIA_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Not</Label>
            <Textarea
              {...register("note")}
              id="note"
              placeholder="Ziyaret hakkında notlar..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button
                disabled={createMutation.isPending}
                type="button"
                variant="outline"
              >
                İptal
              </Button>
            </DialogClose>
            <Button
              className="cursor-pointer"
              disabled={createMutation.isPending}
              type="submit"
            >
              {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
