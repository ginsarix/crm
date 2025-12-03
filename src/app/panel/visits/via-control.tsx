"use client";

import { Mail, MessageSquare, Phone, Users } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import { cn } from "~/lib/utils";

export default function ViaControl({
  via,
  setVia,
  id,
  includeAll,
}: {
  via: "phone" | "inPerson" | "email" | "sms" | "all";
  setVia: (via: "phone" | "inPerson" | "email" | "sms" | "all") => void;
  id: string;
  includeAll?: boolean;
}) {
  return (
    <ButtonGroup id={id}>
      <Button
        aria-pressed={via === "phone"}
        className={cn(
          via === "phone" && "bg-emerald-500/10 text-emerald-500",
          "hover:bg-emerald-500/20 hover:text-emerald-500"
        )}
        onClick={() => setVia("phone")}
        type="button"
        variant="outline"
      >
        <Phone /> Telefon
      </Button>
      <Button
        aria-pressed={via === "inPerson"}
        className={cn(
          via === "inPerson" && "bg-amber-500/10 text-amber-500",
          "hover:bg-amber-500/20 hover:text-amber-500"
        )}
        onClick={() => setVia("inPerson")}
        type="button"
        variant="outline"
      >
        <Users /> Yüz Yüze
      </Button>
      <Button
        aria-pressed={via === "email"}
        className={cn(
          via === "email" && "bg-indigo-500/10 text-indigo-500",
          "hover:bg-indigo-500/20 hover:text-indigo-500"
        )}
        onClick={() => setVia("email")}
        type="button"
        variant="outline"
      >
        <Mail /> E-posta
      </Button>
      <Button
        aria-pressed={via === "sms"}
        className={cn(
          via === "sms" && "bg-rose-500/10 text-rose-500",
          "hover:bg-rose-500/20 hover:text-rose-500"
        )}
        onClick={() => setVia("sms")}
        type="button"
        variant="outline"
      >
        <MessageSquare /> SMS
      </Button>
      {includeAll && (
        <Button
          aria-pressed={via === "all"}
          className={cn(
            via === "all" && "bg-cyan-500/10 text-cyan-500",
            "hover:bg-cyan-500/20 hover:text-cyan-500"
          )}
          onClick={() => setVia("all")}
          type="button"
          variant="outline"
        >
          Tümü
        </Button>
      )}
    </ButtonGroup>
  );
}
