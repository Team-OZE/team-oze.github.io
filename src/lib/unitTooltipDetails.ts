import tooltipRows from "../../tooltips.json";

export type UnitTooltipStats = {
  armor?: number;
  armorType?: string;
  attackType?: string;
  cooldown?: number;
  count?: number;
  damage?: string;
  hitPoints?: number;
  movementSpeed?: number;
  range?: number;
  rangeType?: string;
  lumber?: number | null;
  income?: number | null;
  bounty?: number | null;
};

export type UnitTooltipDetail = {
  description: string;
  stats: UnitTooltipStats;
};

type TooltipRow = {
  builderUbertip?: string;
  fighterId?: string;
  name?: string;
  type?: string;
};

const { byName: unitTooltipsByName, byId: unitTooltipsById } = buildUnitTooltipLookup(tooltipRows as TooltipRow[]);

export function unitTooltipDetail(unitName: string | null | undefined): UnitTooltipDetail | null {
  if (!unitName) return null;
  return unitTooltipsByName.get(normalizeLookupName(unitName)) ?? null;
}

export function unitTooltipDetailById(unitId: string | null | undefined): UnitTooltipDetail | null {
  if (!unitId) return null;
  return unitTooltipsById.get(normalizeUnitId(unitId)) ?? null;
}

function buildUnitTooltipLookup(rows: TooltipRow[]) {
  const byName = new Map<string, UnitTooltipDetail>();
  const byId = new Map<string, UnitTooltipDetail>();

  for (const row of rows) {
    if (row.type !== "unit" && row.type !== "summon") continue;

    const name = cleanTooltipText(row.name ?? "");
    if (!name) continue;

    const description = cleanTooltipText(row.builderUbertip ?? "");
    const detail = {
      description,
      stats: parseTooltipStats(description)
    };

    byName.set(normalizeLookupName(name), detail);
    if (row.fighterId) byId.set(normalizeUnitId(row.fighterId), detail);
  }

  return { byName, byId };
}

function normalizeLookupName(value: string) {
  return cleanTooltipText(value).toLowerCase().replace(/[\[\]]/g, "").replace(/\s+/g, " ").trim();
}

function normalizeUnitId(value: string) {
  return String(value).toLowerCase();
}

function cleanTooltipText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function parseTooltipStats(description: string): UnitTooltipStats {
  const damage = tooltipField(description, "Damage");
  const speed = numericField(description, "Speed");
  const rangeField = tooltipField(description, "Range");
  const hitPoints = numericField(description, "Hit Points");
  const attackType = tooltipField(description, "Attack Type");
  const armorType = tooltipField(description, "Defense Type");
  const rangeMatch = rangeField?.match(/^(\d+(?:\.\d+)?)(?:\s*\(([^)]+)\))?/);

  return {
    ...(damage ? { damage } : {}),
    ...(speed !== undefined ? { cooldown: speed } : {}),
    ...(rangeMatch ? { range: Number(rangeMatch[1]) } : {}),
    ...(rangeMatch?.[2] ? { rangeType: rangeMatch[2].trim() } : {}),
    ...(hitPoints !== undefined ? { hitPoints } : {}),
    ...(attackType ? { attackType } : {}),
    ...(armorType ? { armorType } : {})
  };
}

function tooltipField(description: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = description.match(new RegExp(`${escapedLabel}:\\s*([^\\n]+)`));
  return match?.[1]?.trim() || undefined;
}

function numericField(description: string, label: string) {
  const value = tooltipField(description, label)?.match(/\d+(?:\.\d+)?/)?.[0];
  if (!value) return undefined;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}
