export const TEE_STOCK_SIZES = ['S', 'M', 'L', 'XL', '2XL'] as const;
export type TeeStockSize = (typeof TEE_STOCK_SIZES)[number];

export const DEFAULT_TEE_MODELS = [
  'Stay Hard',
  'Eat Tren Sleep Repeat',
  'Beast',
  'Soldier of God',
  'Pain Creates Men',
] as const;

export const DEFAULT_TEE_SIZE_SPLIT: Record<TeeStockSize, number> = {
  S: 6,
  M: 15,
  L: 16,
  XL: 10,
  '2XL': 3,
};

export type VariantStockMatrix = Record<string, Record<string, number>>;

/**
 * Normalizes a size string (e.g. `XXL`, `2X-Large`, `2xl`) to canonical tracked size key.
 */
export function normalizeTeeSizeKey(rawSize?: string | null): TeeStockSize | null {
  if (!rawSize) return null;
  const clean = String(rawSize).trim().toUpperCase().replace(/\s+/g, '');
  if (clean === 'S' || clean === 'SMALL') return 'S';
  if (clean === 'M' || clean === 'MEDIUM') return 'M';
  if (clean === 'L' || clean === 'LARGE') return 'L';
  if (clean === 'XL' || clean === 'X-LARGE' || clean === 'XLARGE') return 'XL';
  if (
    clean === '2XL' ||
    clean === 'XXL' ||
    clean === '2X-LARGE' ||
    clean === 'XX-LARGE' ||
    clean === '2XLARGE'
  ) {
    return '2XL';
  }
  return null;
}

/**
 * Builds the default 50-piece per model inventory matrix (`S:6, M:15, L:16, XL:10, 2XL:3`).
 */
export function buildDefaultTeeStockMatrix(
  modelNames: readonly string[] = DEFAULT_TEE_MODELS
): VariantStockMatrix {
  const matrix: VariantStockMatrix = {};
  for (const model of modelNames) {
    matrix[model] = { ...DEFAULT_TEE_SIZE_SPLIT };
  }
  return matrix;
}

/**
 * Computes total remaining units across all models and sizes.
 */
export function computeTotalVariantStock(matrix?: VariantStockMatrix | null): number {
  if (!matrix || typeof matrix !== 'object') return 0;
  let total = 0;
  for (const modelSizes of Object.values(matrix)) {
    if (!modelSizes || typeof modelSizes !== 'object') continue;
    for (const qty of Object.values(modelSizes)) {
      total += Math.max(0, Math.round(Number(qty) || 0));
    }
  }
  return total;
}

/**
 * Parses an ordered item's variant label (e.g. `"Stay Hard · L"`) into `{ model, size }`.
 */
export function parseTeeModelAndSize(
  variantLabel: unknown,
  knownModels: string[]
): { model: string | null; size: TeeStockSize | null } {
  const raw =
    typeof variantLabel === 'object' && variantLabel !== null
      ? String((variantLabel as any).ro || (variantLabel as any).en || Object.values(variantLabel)[0] || '')
      : String(variantLabel || '');

  const trimmed = raw.trim();
  if (!trimmed) return { model: null, size: null };

  const parts = trimmed
    .split(/[·|\/]/g)
    .map((p) => p.trim())
    .filter(Boolean);

  let matchedSize: TeeStockSize | null = null;
  let candidateModelParts: string[] = [];

  for (const part of parts) {
    const asSize = normalizeTeeSizeKey(part);
    if (asSize && !matchedSize) {
      matchedSize = asSize;
    } else {
      candidateModelParts.push(part);
    }
  }

  // Also check trailing size separated by dash/space if not split by middot
  if (!matchedSize && parts.length === 1) {
    const tokens = trimmed.split(/\s+/);
    const lastTokenSize = normalizeTeeSizeKey(tokens[tokens.length - 1]);
    if (lastTokenSize) {
      matchedSize = lastTokenSize;
      candidateModelParts = [tokens.slice(0, -1).join(' ')];
    }
  }

  const candidateModelStr = candidateModelParts.join(' ').trim().toLowerCase();
  const matchedModel =
    knownModels.find((m) => m.toLowerCase() === candidateModelStr) ||
    knownModels.find((m) => trimmed.toLowerCase().includes(m.toLowerCase())) ||
    null;

  return { model: matchedModel, size: matchedSize };
}

/**
 * Parses single or multi-item variant labels (e.g. `"Stay Hard · L, Beast · M"` or arrays)
 * into a list of `{ model, size }` entries.
 */
export function parseAllTeeModelsAndSizes(
  variantInput: unknown,
  knownModels: string[]
): Array<{ model: string; size: TeeStockSize }> {
  const segments: unknown[] = Array.isArray(variantInput)
    ? variantInput
    : typeof variantInput === 'string'
      ? variantInput.split(/[,;\n]+/g).map((s) => s.trim()).filter(Boolean)
      : [variantInput];

  const results: Array<{ model: string; size: TeeStockSize }> = [];
  for (const seg of segments) {
    const parsed = parseTeeModelAndSize(seg, knownModels);
    if (parsed.model && parsed.size) {
      results.push({ model: parsed.model, size: parsed.size });
    }
  }
  return results;
}

