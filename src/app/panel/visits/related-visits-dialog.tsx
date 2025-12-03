"use client";

import type { Visit } from "generated/prisma";
import { Calendar } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ViewVisitDialog } from "./view-dialog";

export default function RelatedVisitsDialog({ visits }: { visits: Visit[] }) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  const handleSelect = (visit: Visit) => {
    setSelectedVisit(visit);
    setViewDialogOpen(true);
  };

  return (
    <>
      <Dialog defaultOpen={true}>
        <DialogContent
          aria-describedby="İlişkili ziyaretler"
          className="max-h-[99vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>İlişkili ziyaretler</DialogTitle>
            <DialogDescription>Müşteriye ait ziyaretler</DialogDescription>
          </DialogHeader>
          {visits.map((visit) => (
            <Button
              className="w-full cursor-pointer rounded-lg border p-3 text-left hover:bg-background/80"
              key={visit.id}
              onClick={() => handleSelect(visit)}
              type="button"
              variant="outline"
            >
              <Calendar /> {visit.date.toLocaleDateString("tr-TR")}
            </Button>
          ))}
        </DialogContent>
      </Dialog>
      {selectedVisit && (
        <ViewVisitDialog
          onOpenChange={setViewDialogOpen}
          open={viewDialogOpen}
          visit={selectedVisit}
        />
      )}
    </>
  );
}
