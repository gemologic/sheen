export type OptimisticRevert = () => void | Promise<void>;

/**
 * Apply app-owned local state immediately and revert once if its commit fails.
 * The app must make its inverse safe for concurrent edits; this helper owns no cache.
 */
export async function optimistic<T>(
  apply: () => OptimisticRevert,
  commit: () => T | Promise<T>,
): Promise<T> {
  const revert = apply();
  try {
    return await commit();
  } catch (commitError) {
    try {
      await revert();
    } catch (revertError) {
      throw new AggregateError([commitError, revertError], "Optimistic commit and rollback both failed", { cause: commitError });
    }
    throw commitError;
  }
}
