export async function runCacheOperation<T>(
  operation: Promise<T>,
  fallback: T,
  label: string,
  timeoutMs = 3000,
): Promise<T> {
  let timeoutId = 0;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((resolve) => {
        timeoutId = window.setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } catch (error) {
    console.warn(`Forocoches Premium: fallo en cache (${label})`, error);
    return fallback;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
