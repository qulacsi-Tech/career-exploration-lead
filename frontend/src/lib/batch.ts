/** A placement batch as a range ("2022-2024"), or the single year when it has no start. */
export function batchLabel(batch: { year: number; yearStart?: number | null }): string {
  return batch.yearStart && batch.yearStart < batch.year ? `${batch.yearStart}-${batch.year}` : String(batch.year);
}
