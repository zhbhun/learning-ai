const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(iso) {
  // Date-only ISO strings ("2024-05-15") are parsed by `new Date()` as UTC
  // midnight, so local-time getters shift the day in negative UTC offsets.
  // Parse Y-M-D explicitly to keep the calendar date intact in any timezone.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${iso}`);
  }
  // getMonth() is already 0-based: index MONTHS directly, no -1.
  const monthName = MONTHS[d.getMonth()];
  return `${monthName} ${d.getDate()}, ${d.getFullYear()}`;
}

module.exports = { formatDate };
