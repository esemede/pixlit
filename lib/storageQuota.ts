import type { PlanId } from "@/lib/plans";
import { PLANS, canFitStorage } from "@/lib/plans";

type SupabaseQueryResult<T> = {
  data: T | null;
  error: Error | null;
};

type SupabaseFilterBuilder<T> = PromiseLike<SupabaseQueryResult<T>> & {
  eq: (column: string, value: string | number) => SupabaseFilterBuilder<T>;
};

type SupabaseFromBuilder = {
  select: (columns: string) => SupabaseFilterBuilder<unknown[]>;
};

type SupabaseLike = {
  from: (table: string) => SupabaseFromBuilder;
};

export interface StorageUsage {
  pagesBytes: number;
  voiceBytes: number;
  totalBytes: number;
}

export interface StorageQuotaCheck extends StorageUsage {
  ok: boolean;
  plan: PlanId;
  limitBytes: number;
  projectedBytes: number;
  addBytes: number;
  replacedBytes: number;
}

export function estimateJsonBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value ?? null)).length;
}

export function formatBytes(bytes: number): string {
  const gb = 1024 * 1024 * 1024;
  const mb = 1024 * 1024;
  if (bytes >= gb) return `${(bytes / gb).toFixed(bytes % gb === 0 ? 0 : 1)} GB`;
  if (bytes >= mb) return `${(bytes / mb).toFixed(bytes % mb === 0 ? 0 : 1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}

export async function getUserStorageUsage(
  supabase: unknown,
  userId: string,
): Promise<StorageUsage> {
  const db = supabase as SupabaseLike;
  const { data: pages, error: pagesError } = await db
    .from("notebook_pages")
    .select("strokes")
    .eq("user_id", userId);

  if (pagesError) throw pagesError;

  const pagesBytes = ((pages ?? []) as Array<{ strokes: unknown }>).reduce(
    (sum, page) => sum + estimateJsonBytes(page.strokes ?? []),
    0,
  );

  const { data: voiceNotes, error: voiceError } = await db
    .from("voice_notes")
    .select("file_size_bytes")
    .eq("user_id", userId);

  if (voiceError) throw voiceError;

  const voiceBytes = ((voiceNotes ?? []) as Array<{ file_size_bytes: number | null }>).reduce(
    (sum, note) => sum + (note.file_size_bytes ?? 0),
    0,
  );

  return { pagesBytes, voiceBytes, totalBytes: pagesBytes + voiceBytes };
}

export async function assertStorageQuota({
  supabase,
  userId,
  plan,
  addBytes,
  replacedBytes = 0,
}: {
  supabase: unknown;
  userId: string;
  plan: PlanId;
  addBytes: number;
  replacedBytes?: number;
}): Promise<StorageQuotaCheck> {
  const usage = await getUserStorageUsage(supabase, userId);
  const currentBytes = Math.max(0, usage.totalBytes - replacedBytes);
  const projectedBytes = currentBytes + addBytes;
  const limitBytes = PLANS[plan].maxStorageBytes;

  return {
    ...usage,
    ok: canFitStorage(plan, currentBytes, addBytes),
    plan,
    limitBytes,
    projectedBytes,
    addBytes,
    replacedBytes,
  };
}
