export type Player = {
  id: number;
  battleTag: string;
  name: string;
  elo: number | null;
};

export type Team = {
  id: number;
  result: "win" | "loss" | "unknown";
  players: Player[];
};

export type Replay = {
  id: number;
  matchId: string;
  startedAt: string;
  finishedAt: string;
  duration: string;
  durationSeconds: number;
  mode: string;
  gameMode: string;
  subMode: string;
  mapVersion: string;
  kingSpell: string | null;
  winningTeamId: number | null;
  teams: Team[];
};

export type GameModeOption = {
  label: string;
  count: number;
};

export type EloRange = {
  min: number;
  max: number;
  selectedMin: number;
  selectedMax: number;
};

export type GamesPage = {
  source: string;
  count: number;
  mode: string | null;
  modes: GameModeOption[];
  gameMode: string | null;
  gameModes: GameModeOption[];
  eloRange: EloRange | null;
  page: number;
  pageSize: number;
  pageCount: number;
  replays: Replay[];
  playerSearch?: PlayerSearchResult | null;
};

export type PlayerSearchGroup = {
  id: string;
  mode: string;
  gameMode: string;
  count: number;
  page: number;
  pageSize: number;
  pageCount: number;
  replays: Replay[];
};

export type PlayerSearchResult = {
  query: string;
  count: number;
  groups: PlayerSearchGroup[];
};
