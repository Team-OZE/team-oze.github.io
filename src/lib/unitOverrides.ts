const heroDisplayNameByUnitId = new Map<string, string>([
  ["h996", "Altar of Heroes"],
  ["h0g5", "Archmage - Level 1"],
  ["h0g4", "Archmage - Level 2"],
  ["h0g3", "Archmage - Level 3"],
  ["h0dy", "Dark Ranger - Level 1"],
  ["h0dz", "Dark Ranger - Level 2"],
  ["h0e0", "Dark Ranger - Level 3"],
  ["h0de", "Death Knight - Level 1"],
  ["h0dd", "Death Knight - Level 2"],
  ["h0da", "Death Knight - Level 3"],
  ["h0gi", "Dread Lord - Level 1"],
  ["h0gs", "Dread Lord - Level 2"],
  ["h0gj", "Dread Lord - Level 3"],
  ["h0ej", "Keeper of the Grove - Level 1"],
  ["h0fb", "Keeper of the Grove - Level 2"],
  ["h0f6", "Keeper of the Grove - Level 3"],
  ["h0eq", "Mountain King - Level 1"],
  ["h0ho", "Mountain King - Level 2"],
  ["h0hp", "Mountain King - Level 3"],
  ["h0hc", "Naga Sea Witch - Level 1"],
  ["h0h6", "Naga Sea Witch - Level 2"],
  ["h0h7", "Naga Sea Witch - Level 3"],
  ["h0ek", "Paladin - Level 1"],
  ["h0iu", "Paladin - Level 2"],
  ["h0iv", "Paladin - Level 3"],
  ["h0fk", "Priestess of the Moon - Level 1"],
  ["h0el", "Priestess of the Moon - Level 2"],
  ["h0fc", "Priestess of the Moon - Level 3"],
  ["h0eo", "Tauren Chieftain - Level 1"],
  ["h0i9", "Tauren Chieftain - Level 2"],
  ["h0ia", "Tauren Chieftain - Level 3"],
  ["u835", "Archmage"],
  ["u836", "Dark Ranger"],
  ["u837", "Naga Sea Witch"],
  ["u838", "Priestess of the Moon"],
  ["u839", "Mountain King"],
  ["u840", "Tauren Chieftain"],
  ["u841", "Dread Lord"],
  ["u842", "Paladin"],
  ["u843", "Death Knight"],
  ["u844", "Keeper of the Grove"]
]);

const heroIconNameByUnitId = new Map<string, string>([
  ["h996", "btnaltarofkings"],
  ["h0g5", "btnheroarchmage"],
  ["h0g4", "btnheroarchmage"],
  ["h0g3", "btnheroarchmage"],
  ["u835", "btnheroarchmage"],
  ["h0dy", "btnbansheeranger"],
  ["h0dz", "btnbansheeranger"],
  ["h0e0", "btnbansheeranger"],
  ["u836", "btnbansheeranger"],
  ["h0de", "btnherodeathknight"],
  ["h0dd", "btnherodeathknight"],
  ["h0da", "btnherodeathknight"],
  ["u843", "btnherodeathknight"],
  ["h0gi", "btnherodreadlord"],
  ["h0gs", "btnherodreadlord"],
  ["h0gj", "btnherodreadlord"],
  ["u841", "btnherodreadlord"],
  ["h0ej", "btnkeeperofthegrove"],
  ["h0fb", "btnkeeperofthegrove"],
  ["h0f6", "btnkeeperofthegrove"],
  ["u844", "btnkeeperofthegrove"],
  ["h0eq", "btnheromountainking"],
  ["h0ho", "btnheromountainking"],
  ["h0hp", "btnheromountainking"],
  ["u839", "btnheromountainking"],
  ["h0hc", "btnnagaseawitch"],
  ["h0h6", "btnnagaseawitch"],
  ["h0h7", "btnnagaseawitch"],
  ["u837", "btnnagaseawitch"],
  ["h0ek", "btnheropaladin"],
  ["h0iu", "btnheropaladin"],
  ["h0iv", "btnheropaladin"],
  ["u842", "btnheropaladin"],
  ["h0fk", "btnpriestessofthemoon"],
  ["h0el", "btnpriestessofthemoon"],
  ["h0fc", "btnpriestessofthemoon"],
  ["u838", "btnpriestessofthemoon"],
  ["h0eo", "btnherotaurenchieftain"],
  ["h0i9", "btnherotaurenchieftain"],
  ["h0ia", "btnherotaurenchieftain"],
  ["u840", "btnherotaurenchieftain"]
]);

const barracksIconNameByUnitId = new Map<string, string>([
  ["h04o", "btnmilitia"],
  ["h04p", "btnarcher"],
  ["h04r", "btnghoul"],
  ["h04s", "btnfootman"],
  ["h04q", "btnbluedragonspawn"],
  ["h04t", "btnpriest"],
  ["h04u", "btnsnapdragon"],
  ["h04v", "btnthecaptain"],
  ["h04w", "btnfurbolgpanda"],
  ["h04x", "btnwyvern"],
  ["h04y", "btndwarfcar"],
  ["h04z", "btnchaosgrunt"],
  ["h050", "btntimberwolf"],
  ["h051", "btnicetrollshadowpriest"],
  ["h052", "btnchaoswarlock"],
  ["h053", "btnfurbolgpanda"],
  ["h055", "btngryphonrider"],
  ["h056", "btnshaman"],
  ["h057", "btnabomination"],
  ["h05m", "btnspiritwyvern"],
  ["h059", "btnfrostbear"],
  ["h05b", "btnseagiantgreen"],
  ["h05a", "btninfernalcannon"],
  ["h0br", "btndoomguard"]
]);

function normalizedUnitId(unitType: string) {
  return unitType.toLowerCase();
}

function commandButtonIconPath(iconName: string) {
  return `/_replay-viewer/assets/command-buttons-classic/${iconName}.png`;
}

export function displayNameForUnit(unitType: string, fallbackName: string | null | undefined) {
  return heroDisplayNameByUnitId.get(normalizedUnitId(unitType)) ?? fallbackName ?? unitType;
}

export function iconPathOverrideForUnit(unitType: string) {
  const unitId = normalizedUnitId(unitType);
  const iconName = heroIconNameByUnitId.get(unitId) ?? barracksIconNameByUnitId.get(unitId);
  return iconName ? commandButtonIconPath(iconName) : null;
}
