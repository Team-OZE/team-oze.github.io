import { existsSync } from "node:fs";
import path from "node:path";
import unitIconMapRows from "./unitIconMap.json";
import { iconPathOverrideForUnit } from "./unitOverrides";

type UnitIconMapRow = {
  builder: string;
  fighter: string;
  icon: string;
};

const unitIconById = buildUnitIconLookup(unitIconMapRows as UnitIconMapRow[]);
const commandButtonAssetExistsCache = new Map<string, boolean>();
const commandButtonAssetDir = "command-buttons-classic";
const fallbackUnitIconName = "btnfootman";

function buildUnitIconLookup(rows: UnitIconMapRow[]) {
  const lookup = new Map<string, string>();

  for (const row of rows) {
    const iconName = commandButtonName(row.icon);
    if (!iconName) continue;

    if (row.builder) lookup.set(row.builder, iconName);
    if (row.fighter) lookup.set(row.fighter, iconName);
  }

  return lookup;
}

function commandButtonName(icon: string) {
  const name = icon.replaceAll("\\", "/").split("/").pop()?.toLowerCase().replace(/\.blp$/, "") ?? "";
  return name || null;
}

function commandButtonAssetExists(iconName: string) {
  if (!iconName) return false;

  const cached = commandButtonAssetExistsCache.get(iconName);
  if (cached === true) return true;

  const exists = existsSync(path.join(process.cwd(), "public", "_replay-viewer", "assets", commandButtonAssetDir, `${iconName}.png`));
  commandButtonAssetExistsCache.set(iconName, exists);
  return exists;
}

function commandButtonIconPath(iconName: string) {
  return `/_replay-viewer/assets/${commandButtonAssetDir}/${iconName}.png`;
}

function mappedCommandButtonIconPath(unitId: string) {
  const iconName = unitIconById.get(unitId);
  if (!iconName || !commandButtonAssetExists(iconName)) return null;
  return commandButtonIconPath(iconName);
}

export function iconPathForUnit(unitType: string, upgradeGroup: string | null = null) {
  const overrideIconPath = iconPathOverrideForUnit(unitType);
  if (overrideIconPath) return overrideIconPath;

  const currentUnitCommandButton = mappedCommandButtonIconPath(unitType);
  if (currentUnitCommandButton) {
    return currentUnitCommandButton;
  }

  if (upgradeGroup) {
    const upgradeGroupCommandButton = mappedCommandButtonIconPath(upgradeGroup);
    if (upgradeGroupCommandButton) return upgradeGroupCommandButton;
  }

  return commandButtonIconPath(fallbackUnitIconName);
}
