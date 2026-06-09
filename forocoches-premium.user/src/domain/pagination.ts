export function getVisiblePageNumbers(
  totalPages: number,
  currentPage: number | null,
): number[] {
  if (totalPages <= 11) {
    return Array.from({ length: totalPages }, (_value, index) => index + 1);
  }

  const page = currentPage || 1;
  const maxVisible = 11;
  const halfWindow = Math.floor(maxVisible / 2);
  const start = Math.max(
    1,
    Math.min(page - halfWindow, totalPages - maxVisible + 1),
  );

  return Array.from({ length: maxVisible }, (_value, index) => start + index);
}
