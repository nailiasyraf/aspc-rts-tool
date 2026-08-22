import { z } from "zod";

export const PC_BUILD_SCHEMA = z.object({
  id: z.string(),
  section: z.string().optional(),
  name: z.string().min(1),
  cpu: z.string().optional(),
  motherboard: z.string().optional(),
  cooler: z.string().optional(),
  ram: z.array(z.string()),
  gpu: z.string().optional(),
  storage: z.array(z.string()),
  psu: z.string().optional(),
  chassis: z.string().optional(),
  fans: z.array(z.string()),
  notes: z.array(z.string()),
  salePrice: z.number().optional(),
  sourceColumn: z.string().optional(),
  sheetName: z.literal("Marketing"),
  raw: z.record(z.string(), z.unknown()),
  warnings: z.array(z.string()),
});

export type PCBuild = z.infer<typeof PC_BUILD_SCHEMA>;

export type ParserWarning = {
  column?: string;
  buildName?: string;
  message: string;
};

export type ParseResult = {
  builds: PCBuild[];
  warnings: ParserWarning[];
};

export type LoadedWorkbook = {
  fileName: string;
  sheetName: "Marketing";
  builds: PCBuild[];
  warnings: ParserWarning[];
  loadedAt: Date;
};
