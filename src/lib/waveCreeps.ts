import type { UnitTooltipStats } from "./unitTooltipDetails";

export type WaveCreep = {
  level: number;
  unitType: string;
  unitName: string;
  iconPath: string;
  count: number;
  description: string | null;
  stats: UnitTooltipStats;
};

const DEFAULT_WAVE_CREEP_COUNT = 100;
const BOSS_WAVE_CREEP_COUNT = 12;
const BOSS_WAVE_LEVELS = new Set([10, 20, 30]);
const WAVE_CREEP_COUNT_OVERRIDES = new Map([[35, 2]]);

const waveCreeps: WaveCreep[] = [
  waveCreep(1, "h002", "Crab", 100, "7-9", 0.9, 90, 235, "pierce", "none"),
  waveCreep(2, "h000", "Murloc", 170, "10-14", 0.9, 90, 275, "normal", "none"),
  waveCreep(3, "h005", "Scorpion", 250, "14-15", 0.9, 90, 325, "normal", "medium"),
  waveCreep(4, "h001", "Quilbeast", 250, "14-16", 0.9, 400, 300, "pierce", "large"),
  waveCreep(5, "h00I", "Hawk", 350, "31-33", 0.9, 90, 320, "magic", "small"),
  waveCreep(6, "h003", "Rock Golem", 570, "47-48", 1, 90, 300, "siege", "normal", "Fortified Unit"),
  waveCreep(7, "h004", "Satyr", 600, "49-51", 1.1, 100, 320, "pierce", "small"),
  waveCreep(8, "h007", "Acolyte", 530, "26-30", 0.85, 400, 300, "magic", "medium"),
  waveCreep(9, "h008", "Zombie", 1075, "57-59", 0.9, 120, 320, "normal", "large"),
  waveCreep(10, "H05I", "Draenei Chieftain", 5800, "200-220", 0.42, 180, 200, "chaos", "small", "Boss Unit"),
  waveCreep(11, "h00A", "Clockwerk Goblin", 1250, "76-78", 0.8, 90, 350, "siege", "normal", "Fortified Unit"),
  waveCreep(12, "h00B", "Siren", 1050, "44-46", 0.72, 400, 350, "pierce", "medium", "King's Defiance, Regicide"),
  waveCreep(13, "h00C", "Couatl", 1500, "95-98", 0.8, 90, 345, "magic", "small"),
  waveCreep(14, "h00D", "Tuskar Warrior", 2350, "124-126", 0.85, 90, 350, "normal", "medium", "King's Defiance, Regicide"),
  waveCreep(15, "h00E", "Centaur", 2550, "150-155", 0.83, 120, 350, "normal", "large"),
  waveCreep(16, "h00F", "Lightning Chicken", 1300, "100-112", 0.6, 400, 350, "magic", "small"),
  waveCreep(17, "h00G", "Flesh Golem", 3000, "223-227", 0.81, 150, 325, "siege", "normal", "Fortified Unit"),
  waveCreep(18, "h00H", "Sludge Flinger", 3850, "200-205", 0.64, 150, 350, "magic", "medium"),
  waveCreep(19, "h00J", "Giant Spider", 3700, "201-201", 0.7, 150, 350, "pierce", "small"),
  waveCreep(20, "H05J", "Dragon Turtle", 18500, "200-230", 0.47, 425, 350, "chaos", "divine", "Torrent, Boss Unit"),
  waveCreep(21, "h03P", "Hippogryph", 11900, "223-230", 0.6, 180, 350, "pierce", "small"),
  waveCreep(22, "h03Q", "Mammoth", 18600, "246-258", 0.98, 120, 275, "siege", "normal", "Fortified Unit"),
  waveCreep(23, "h03R", "Wildkin", 18300, "340-354", 0.91, 180, 300, "normal", "large"),
  waveCreep(24, "h03T", "Revenant", 12000, "242-262", 0.85, 600, 330, "magic", "medium", "Thunder attack"),
  waveCreep(25, "h03U", "Succubus", 25200, "364-388", 0.69, 150, 420, "pierce", "small"),
  waveCreep(26, "h03S", "Myrmidon", 24000, "330-350", 0.88, 170, 375, "normal", "large"),
  waveCreep(27, "h03V", "Doom Guard", 28000, "314-324", 0.57, 180, 400, "normal", "medium"),
  waveCreep(28, "h03W", "Juggernaut", 22000, "299-309", 0.64, 450, 350, "siege", "normal", "Fortified Unit"),
  waveCreep(29, "h006", "Frost Wyrm", 23000, "333-353", 0.91, 400, 360, "magic", "large"),
  waveCreep(30, "H05K", "Magnataur", 23000, "777-888", 0.6, 100, 360, "chaos", "normal", "Magnataur's Shockwave, Boss Unit, Fortified Unit"),
  waveCreep(31, "h05L", "Pit Lord", 18000, "600-610", 0.8, 225, 350, "chaos", "none", "Boss Unit"),
  waveCreep(32, "H058", "Crypt Lord", 30000, "700-730", 0.48, 225, 400, "pierce", "small", "Crypt Lord Poison, Boss Unit"),
  waveCreep(33, "H027", "War Lord", 25000, "700-900", 0.45, 225, 400, "normal", "large", "Life Steal, Boss Unit"),
  waveCreep(34, "H05G", "Fire Lord", 15000, "700-720", 0.8, 450, 350, "magic", "medium", "Boss Unit"),
  waveCreep(35, "H08U", "Burning Legion", 100000, "1000-1000", 0.4, 500, 400, "chaos", "normal", "Permanent Immolation, Boss Unit, Call to Arms")
];

const waveCreepByLevel = new Map(waveCreeps.map((creep) => [creep.level, creep]));

export function waveCreepForLevel(level: number): WaveCreep | null {
  return waveCreepByLevel.get(level) ?? null;
}

function waveCreep(
  level: number,
  unitType: string,
  unitName: string,
  hitPoints: number,
  damage: string,
  cooldown: number,
  range: number,
  movementSpeed: number,
  attackType: string,
  armorType: string,
  description: string | null = null
): WaveCreep {
  return {
    level,
    unitType,
    unitName,
    iconPath: `/_replay-viewer/assets/wave-creeps/${unitType}.png`,
    count: WAVE_CREEP_COUNT_OVERRIDES.get(level) ?? (BOSS_WAVE_LEVELS.has(level) ? BOSS_WAVE_CREEP_COUNT : DEFAULT_WAVE_CREEP_COUNT),
    description,
    stats: {
      damage,
      cooldown,
      range,
      hitPoints,
      movementSpeed,
      attackType,
      armorType
    }
  };
}
