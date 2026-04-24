import { z } from "zod";

export const DistrictValidation = z.enum([
  "merkez",
  "avanos",
  "urgup",
  "hacibektas",
  "kozakli",
  "acigol",
  "derinkuyu",
  "gulsehir",
]);
