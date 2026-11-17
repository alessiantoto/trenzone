/**
 * Universal timezone-safe timestamp helpers for the global store drop countdown.
 * Ensures every country sees the exact same countdown and unlocks simultaneously at one UTC instant.
 */

export function parseUniversalDropEndDateMs(raw?: string | null): number | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // ISO string with explicit timezone (`Z` or `±HH:MM` / `±HHMM`) -> identical across all timezones
  if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) {
    const ms = Date.parse(trimmed);
    return Number.isFinite(ms) ? ms : null;
  }

  // Legacy naive datetime without timezone (`YYYY-MM-DDTHH:mm`) -> treat as Europe/Bucharest wall time
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6] || 0);
    const approxUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Bucharest',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(approxUtc);

      const getPart = (type: string) => Number(parts.find((p) => p.type === type)?.value || 0);
      const bucharestAsUtc = Date.UTC(
        getPart('year'),
        getPart('month') - 1,
        getPart('day'),
        getPart('hour') % 24,
        getPart('minute'),
        getPart('second')
      );
      const offsetMs = bucharestAsUtc - approxUtc.getTime();
      return Date.UTC(year, month - 1, day, hour, minute, second) - offsetMs;
    } catch {
      return Date.UTC(year, month - 1, day, hour, minute, second) - 2 * 3600 * 1000;
    }
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeDropDateToUtcIso(raw?: string | null): string | null {
  const ms = parseUniversalDropEndDateMs(raw);
  return ms !== null ? new Date(ms).toISOString() : null;
}

