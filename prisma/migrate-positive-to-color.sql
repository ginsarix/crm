-- Migration: rename `positive` (Positive enum) → `color` (Color enum) on CustomerCard
-- Mapping: Pozitif→green, Negatif→orange, Nötr→gray

CREATE TYPE "Color" AS ENUM ('green', 'blue', 'orange', 'gray');

ALTER TABLE "CustomerCard" ADD COLUMN "color" "Color" NOT NULL DEFAULT 'gray';

UPDATE "CustomerCard"
SET "color" = CASE
  WHEN "positive" = 'Pozitif' THEN 'green'::"Color"
  WHEN "positive" = 'Negatif' THEN 'orange'::"Color"
  ELSE 'gray'::"Color"
END;

ALTER TABLE "CustomerCard" DROP COLUMN "positive";

DROP TYPE "Positive";
