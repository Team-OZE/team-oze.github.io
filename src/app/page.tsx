"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Eye, Search, X } from "lucide-react";
import * as React from "react";

type Player = {
  id: number;
  battleTag: string;
  name: string;
  elo: number | null;
};

type Team = {
  id: number;
  result: "win" | "loss" | "unknown";
  players: Player[];
};

type Replay = {
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

type GamesPayload = {
  source: string;
  count: number;
  mode: string | null;
  modes: GameModeOption[];
  gameMode: string | null;
  gameModes: GameModeOption[];
  page: number;
  pageSize: number;
  pageCount: number;
  replays: Replay[];
  playerSearch?: PlayerSearchResult | null;
};

type GameModeOption = {
  label: string;
  count: number;
};

type PlayerSearchGroup = {
  id: string;
  mode: string;
  gameMode: string;
  count: number;
  page: number;
  pageSize: number;
  pageCount: number;
  replays: Replay[];
};

type PlayerSearchResult = {
  query: string;
  count: number;
  groups: PlayerSearchGroup[];
};

type PlayerModeStat = {
  gameMode: number;
  label: string;
  mmr: number | null;
  rank: number | null;
  rankingPoints: number | null;
  topPercent: number | null;
  wins: number;
  losses: number;
  games: number;
  winrate: number | null;
};

type PlayerRaceStat = {
  race: number;
  label: string;
  wins: number;
  losses: number;
  games: number;
  winrate: number | null;
};

type UnitPreference = {
  unitType: string;
  unitName: string;
  iconPath: string;
  count: number;
  metric?: "roll-pick" | "opening-pick";
  seen?: number;
  percent: number | null;
};

type LocalModeStat = {
  mode: string;
  gameMode: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number | null;
};

type RecentGamePlayer = {
  id: number;
  battleTag: string | null;
  name: string;
  isProfilePlayer?: boolean;
};

type RecentGameTeam = {
  id: number;
  result: "win" | "loss" | "unknown";
  players: RecentGamePlayer[];
};

type RecentGame = {
  id: number;
  matchId: string;
  startedAt: string;
  duration: string;
  mode: string;
  gameMode: string;
  result: "win" | "loss" | "unknown";
  profileTeamId?: number;
  teams?: RecentGameTeam[];
  teammates: string[];
  opponents: string[];
};

type LocalPlayerProfileStats = {
  games: number;
  wins: number;
  losses: number;
  winrate: number | null;
  lastGameAt: string | null;
  averageValue: number | null;
  averageIncome: number | null;
  averageLeak: number | null;
  modes: LocalModeStat[];
  favoriteRolls: UnitPreference[];
  favoriteOpeners: UnitPreference[];
  recentGames: RecentGame[];
};

type PlayerRivalry = {
  battleTag: string;
  name: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number | null;
};

type PlayerRivalryGroup = {
  matchCount?: number;
  mostPlayed: PlayerRivalry[];
  mostDefeated: PlayerRivalry[];
  bestWinrate: PlayerRivalry[];
  toughest: PlayerRivalry[];
  teammatesMostPlayed: PlayerRivalry[];
  teammatesBestWinrate: PlayerRivalry[];
};

type PlayerRivalryMode = PlayerRivalryGroup & {
  gameMode: number;
  label: string;
};

type PlayerRivalries = PlayerRivalryGroup & {
  source?: "w3champions";
  seasons: number[];
  startedAt: string | null;
  endedAt: string | null;
  modes?: PlayerRivalryMode[];
};

type PlayerProfileSeason = {
  schemaVersion?: number;
  season: number;
  label: string;
  startedAt: string | null;
  endedAt: string | null;
  current: PlayerModeStat | null;
  modes: PlayerModeStat[];
  races: PlayerRaceStat[];
  local: LocalPlayerProfileStats;
  fetchError: string | null;
  refreshedAt: string;
};

type PlayerProfilePayload = {
  schemaVersion?: number;
  battleTag: string;
  name: string;
  refreshedAt: string;
  cacheStatus: "hit" | "refreshed" | "stale";
  fetchError: string | null;
  w3cProfileUrl: string;
  selectedSeason: number | null;
  seasons: PlayerProfileSeason[];
  w3c: {
    available: boolean;
    season: number | null;
    current: PlayerModeStat | null;
    modes: PlayerModeStat[];
    races: PlayerRaceStat[];
    allTime: {
      wins: number;
      losses: number;
      games: number;
      winrate: number | null;
    } | null;
    participatedSeasons: number[];
    country: string | null;
  };
  local: LocalPlayerProfileStats;
  rivalries?: PlayerRivalries;
};

type ViewerSession = {
  replayGameId: string;
  initialSeekSeconds: number;
  layer: "page" | "profile";
  title: string;
};

const views = [
  { id: "games", label: "Games" },
  { id: "game", label: "Map" },
  { id: "guides", label: "Guides" },
  { id: "community", label: "Community" },
  { id: "w3champions", label: "W3Champions" }
] as const;

type ViewId = (typeof views)[number]["id"];

// Guides are unfinished and intentionally hidden from the main menu; we'll return to this section later.
const menuViews = views.filter((view) => view.id !== "guides");

type StarterCategory = "Core" | "Starter" | "Conditional" | "Avoid";

type GuideTab = "All" | StarterCategory;

type GuideMode = "starters" | "level-one";

type StarterGuide = {
  category: StarterCategory;
  file: string;
  id: string;
  index: number;
  note: string;
  title: string;
};

type LevelOneUnitIcon = {
  unitType: string;
  unitName: string;
  iconPath: string;
};

type LevelOneBuildUnit = LevelOneUnitIcon & {
  actionId: number;
  col: number;
  goldCost: number | null;
  level: number;
  locationX: number;
  locationY: number;
  row: number;
  timeMillis: number;
  totalGoldCost: number | null;
};

type LevelOnePlay = {
  id: string;
  gameMode: string;
  grid: {
    cols: number;
    rows: number;
  };
  income: number;
  levelEndMillis: number;
  mapVersion: string;
  matchId: string;
  player: {
    battleTag: string;
    elo: number;
    id: number;
    name: string;
  };
  replayId: number;
  roll: LevelOneUnitIcon[];
  startedAt: string;
  units: LevelOneBuildUnit[];
  value: number;
};

type LevelOneUnitGuide = LevelOneUnitIcon & {
  examples: LevelOnePlay[];
  examplesCount: number;
  playersCount: number;
};

type LevelOneGuidePayload = {
  source: string;
  minElo: number;
  scope: {
    gameMode: string;
    mode: string;
  };
  highPlayerCount: number;
  playCount: number;
  unitCount: number;
  units: LevelOneUnitGuide[];
};

const starterFiles = [
  "1.png",
  "2.png",
  "3.png",
  "4.png",
  "5.png",
  "6.png",
  "7.png",
  "8.png",
  "9.png",
  "10.png",
  "11.png",
  "12.png",
  "13.png",
  "14.png",
  "15.png",
  "16_4alphamales.png",
  "17_2levi.png",
  "18_frontSOHdef_backx2off.png",
  "19_6mili_restpeasants.png",
  "20_3vio.png",
  "21_1doppel1nightmare.png",
  "22_17ogre_1up.png",
  "23_2swordmage.png",
  "24_3wolverine.png",
  "25_6bloodorcwarriors.png",
  "26_anytank_lod.png",
  "27_wm_mw.png",
  "28_2seers.png",
  "29_2orcwarchiefs.png",
  "30_1hellraiser_1hellghost.png",
  "31_2necrolytes.png",
  "32_steamroller_REQUIRES_GOOD_CA_OR_LEAK.png",
  "33_3knight.png",
  "34_3wandigoo_ftier-trash.png",
  "35_4vet_3peewee.png",
  "36_3skeletor_1bonewarrior.png",
  "37_greymane_spawnofdragons.png",
  "38_2windrider.png",
  "39_9raiders.png",
  "40_infantry_destroyer_grizzly.png",
  "41_infantry_destroyer_bloodorwarrior_2orcwarrior.png",
  "42_death_dragon.png",
  "43_2golem.png",
  "44_4medusa_f-tier-trash.png",
  "45_3dwarven_engineers.png",
  "46_3cyborg.png",
  "47_meridian.png",
  "48_4frenzy_ghoul_beyond-f-tier-trash.png",
  "49_3thunderbirds.png",
  "50_2skeletor_1bonewarrior_sea-giant.png",
  "51_9machine-turret_i-would-rather-leave-than-build-this.png"
] as const;

const guideTabs = ["All", "Core", "Starter", "Conditional", "Avoid"] as const;

const pageSize = 8;
const playerSearchMinimumCharacters = 3;

function getStarterCategory(file: string): StarterCategory {
  if (/beyond-f-tier|f-tier|rather-leave/i.test(file)) {
    return "Avoid";
  }

  if (/requires/i.test(file)) {
    return "Conditional";
  }

  if (/^\d+\.png$/i.test(file)) {
    return "Core";
  }

  return "Starter";
}

function titleCase(value: string) {
  const specialCases: Record<string, string> = {
    ca: "CA",
    def: "def",
    lod: "LOD",
    mw: "MW",
    soh: "SOH",
    vet: "Veteran",
    vio: "Violet",
    wm: "WM",
    x2: "x2"
  };

  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      const normalized = word.toLowerCase();

      if (specialCases[normalized]) {
        return specialCases[normalized];
      }

      return normalized[0].toUpperCase() + normalized.slice(1);
    })
    .join(" ");
}

function formatStarterTitle(file: string) {
  const [numberPart] = file.replace(/\.png$/i, "").split("_");
  let rawTitle = file
    .replace(/\.png$/i, "")
    .replace(/^\d+_?/, "")
    .replace(/_?REQUIRES_GOOD_CA_OR_LEAK/gi, "")
    .replace(/_?beyond-f-tier-trash/gi, "")
    .replace(/_?f-tier-trash/gi, "")
    .replace(/_?i-would-rather-leave-than-build-this/gi, "")
    .replace(/frontSOHdef/gi, "front SOH def")
    .replace(/backx2off/gi, "back x2 off")
    .replace(/alphamales/gi, "alpha males")
    .replace(/anytank/gi, "any tank")
    .replace(/bloodorcwarriors/gi, "blood orc warriors")
    .replace(/bloodorwarrior/gi, "blood orc warrior")
    .replace(/doppel/gi, "doppel")
    .replace(/mili/gi, "militia")
    .replace(/restpeasants/gi, "rest peasants")
    .replace(/sea-giant/gi, "sea giant")
    .replace(/spawnofdragons/gi, "spawn of dragons")
    .replace(/machine-turret/gi, "machine turret")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!rawTitle) {
    return `Starter Setup ${numberPart}`;
  }

  rawTitle = rawTitle.replace(/\b(\d+)([a-z])/gi, "$1 $2");

  return titleCase(rawTitle);
}

function getStarterNote(file: string, category: StarterCategory) {
  if (category === "Core") {
    return "Opening setup focused on lane direction, player-zone depth, and first-wave spacing.";
  }

  if (category === "Conditional") {
    return "Conditional opener from the pack. Use it only when your roll has the support the filename calls out.";
  }

  if (category === "Avoid") {
    return "Kept as a warning example. It is useful for learning why some openings are fragile or inefficient.";
  }

  if (/seer|swordmage|windrider|necrolyte|medusa|thunderbird|meridian/i.test(file)) {
    return "Ranged or support-heavy opener. Keep the fragile damage protected behind the first contact line.";
  }

  if (/golem|grizzly|lod|greymane|tank/i.test(file)) {
    return "Tank-led opener showing how the frontline anchors the first contact and protects the follow-up units.";
  }

  return "Starter opener showing the unit mix, spacing, and first-wave build shape.";
}

const starterGuides: StarterGuide[] = starterFiles.map((file, index) => {
  const category = getStarterCategory(file);

  return {
    category,
    file,
    id: file,
    index,
    note: getStarterNote(file, category),
    title: formatStarterTitle(file)
  };
});

function formatStartParts(value: string) {
  const [datePart, timePart] = value.split(" ");
  const [, month, day] = datePart.split("-");
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    Number(month) - 1
  ];
  return {
    date: `${Number(day)} ${monthName}`,
    time: timePart.slice(0, 5)
  };
}

function formatKingSpell(value: string | null) {
  if (!value) {
    return null;
  }

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTeamSize(value: string) {
  return value.replace(/^Legion TD\s+/i, "");
}

function formatGameMode(value: string) {
  return value.replace(/^Legion TD:\s*/i, "");
}

function formatProfileNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatProfilePercent(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return `${(value * 100).toFixed(digits)}%`;
}

function formatTopPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return `Top ${Math.max(0.1, value).toFixed(value < 1 ? 1 : 0)}%`;
}

function formatProfileDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const start = formatStartParts(value);
  return `${start.date}, ${start.time}`;
}

function formatProfileDateRange(startedAt: string | null | undefined, endedAt: string | null | undefined) {
  if (!startedAt && !endedAt) {
    return null;
  }

  const start = startedAt ? formatStartParts(startedAt) : null;
  const end = endedAt ? formatStartParts(endedAt) : null;

  if (start && end) {
    return `${start.date} - ${end.date}`;
  }

  return start ? `From ${start.date}` : `Until ${end?.date}`;
}

function parseSeekSeconds(value: string | null) {
  if (!value) {
    return 0;
  }

  const seconds = Number(value);

  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

function formatSeekSeconds(milliseconds: number) {
  const millis = Math.max(0, Math.round(milliseconds));

  if (millis % 1000 === 0) {
    return String(millis / 1000);
  }

  return (millis / 1000)
    .toFixed(3)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

function viewerSessionFromLocation() {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const replayGameId = params.get("replayGameId") ?? params.get("gameId") ?? params.get("matchId") ?? params.get("id");

  if (!replayGameId) {
    return null;
  }

  return {
    replayGameId,
    initialSeekSeconds: parseSeekSeconds(params.get("s")),
    layer: "page" as const,
    title: replayGameId
  };
}

function writeViewerUrl(replayGameId: string, seekSeconds: string, mode: "push" | "replace") {
  const url = new URL(window.location.href);
  url.searchParams.delete("replayGameId");
  url.searchParams.delete("gameId");
  url.searchParams.delete("matchId");
  url.searchParams.delete("id");
  url.searchParams.delete("s");
  url.searchParams.set("replayGameId", replayGameId);
  url.searchParams.set("s", seekSeconds);

  window.history[mode === "push" ? "pushState" : "replaceState"](window.history.state, "", url);
}

function removeViewerUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("replayGameId");
  url.searchParams.delete("gameId");
  url.searchParams.delete("matchId");
  url.searchParams.delete("id");
  url.searchParams.delete("s");

  window.history.replaceState(window.history.state, "", url);
}

function formatEmptyGamesMessage(mode: string | null | undefined, gameMode: string | null | undefined) {
  const modeLabel = mode ?? "games";
  const gameModeLabel = gameMode ? ` - ${formatGameMode(gameMode)}` : "";

  return `There are no ${modeLabel}${gameModeLabel} games found.`;
}

function playerDisplayName(player: Player) {
  return player.elo === null ? player.name : `${player.name} (${player.elo})`;
}

function AppLink({
  href,
  children,
  className
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children}
      <ExternalLink aria-hidden="true" size={16} strokeWidth={1.8} />
    </a>
  );
}

function TeamPlayers({ onOpenProfile, team }: { onOpenProfile: (battleTag: string) => void; team: Team }) {
  return (
    <div className={`team team-${team.result}`}>
      {team.players.map((player) => (
        <div className="player" key={player.id} title={player.battleTag}>
          <span className="player-mark" aria-hidden="true" />
          <button className="player-name-button" type="button" onClick={() => onOpenProfile(player.battleTag)}>
            {playerDisplayName(player)}
          </button>
        </div>
      ))}
    </div>
  );
}

function ReplayRow({
  onOpenProfile,
  onOpenViewer,
  replay
}: {
  onOpenProfile: (battleTag: string) => void;
  onOpenViewer: (replay: Replay) => void;
  replay: Replay;
}) {
  const kingSpell = formatKingSpell(replay.kingSpell);
  const start = formatStartParts(replay.startedAt);

  return (
    <article className="replay-row">
      <div className="players-column">
        <TeamPlayers team={replay.teams[0]} onOpenProfile={onOpenProfile} />
        <div className="versus" aria-label="versus">
          VS
        </div>
        <TeamPlayers team={replay.teams[1]} onOpenProfile={onOpenProfile} />
      </div>
      <div className="mode-column" data-label="Mode">
        <strong>{formatTeamSize(replay.mode)}</strong>
        <span>{formatGameMode(replay.subMode)}</span>
        {kingSpell ? <span className="muted">King: {kingSpell}</span> : null}
      </div>
      <div className="version-column" data-label="Version">
        {replay.mapVersion}
      </div>
      <div className="time-column" data-label="Start">
        <span className="start-date">{start.date}</span>
        {" "}
        <span className="start-time">{start.time}</span>
      </div>
      <div className="duration-column" data-label="Duration">
        <span>{replay.duration}</span>
      </div>
      <div className="viewer-column" data-label="Viewer">
        <button
          className="icon-button"
          type="button"
          title="Open replay viewer"
          aria-label={`Open viewer for ${replay.matchId}`}
          onClick={() => onOpenViewer(replay)}
        >
          <Eye aria-hidden="true" size={24} strokeWidth={1.8} />
        </button>
      </div>
    </article>
  );
}

function ReplayViewerModal({
  onClose,
  onOpenProfile,
  onTimeChange,
  viewer
}: {
  onClose: () => void;
  onOpenProfile: (battleTag: string) => void;
  onTimeChange: (replayGameId: string, timeMillis: number) => void;
  viewer: ViewerSession | null;
}) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  React.useEffect(() => {
    if (!viewer) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const captureEscape = viewer.layer === "profile";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (captureEscape) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }

        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown, captureEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, captureEscape);
    };
  }, [onClose, viewer]);

  React.useEffect(() => {
    if (!viewer) {
      return undefined;
    }

    const currentViewer = viewer;

    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const data = event.data as {
        type?: string;
        battleTag?: unknown;
        replayGameId?: unknown;
        gameId?: unknown;
        timeMillis?: unknown;
      };

      if (data?.type === "legionOpenPlayerProfile") {
        const battleTag = typeof data.battleTag === "string" ? data.battleTag.trim() : "";

        if (battleTag) {
          onOpenProfile(battleTag);
        }

        return;
      }

      if (data?.type !== "legionReplayViewerTime") {
        return;
      }

      const replayGameId = String(data.replayGameId || data.gameId || currentViewer.replayGameId);
      const timeMillis = Number(data.timeMillis);

      if (Number.isFinite(timeMillis)) {
        onTimeChange(replayGameId, timeMillis);
      }
    }

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [onOpenProfile, onTimeChange, viewer]);

  if (!viewer) {
    return null;
  }

  const iframeParams = new URLSearchParams({
    replayGameId: viewer.replayGameId,
    s: formatSeekSeconds(viewer.initialSeekSeconds * 1000)
  });

  return (
    <div
      className="viewer-modal"
      data-layer={viewer.layer}
      role="dialog"
      aria-modal="true"
      aria-label={`Replay viewer for ${viewer.title}`}
    >
      <iframe
        ref={iframeRef}
        className="viewer-modal-frame"
        src={`/_replay-viewer/index.html?${iframeParams.toString()}`}
        title={`Replay viewer for ${viewer.title}`}
      />
      <button className="viewer-modal-close" type="button" onClick={onClose} aria-label="Close replay viewer">
        <X aria-hidden="true" size={28} strokeWidth={2.2} />
      </button>
    </div>
  );
}

function ProfileStat({
  label,
  tone,
  value
}: {
  label: string;
  tone?: "good" | "bad" | "accent";
  value: React.ReactNode;
}) {
  return (
    <div className="profile-stat" data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProfileUnitStrip({ items, title }: { items: UnitPreference[]; title: string }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="profile-section">
      <h3>{title}</h3>
      <div className="profile-unit-strip">
        {items.map((item) => (
          <div className="profile-unit" key={item.unitType} title={profileUnitTitle(item)}>
            <img src={item.iconPath} alt="" />
            <span>{formatProfilePercent(item.percent)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function profileUnitTitle(item: UnitPreference) {
  if (item.seen && item.seen > 0) {
    if (item.metric === "opening-pick") {
      return `${item.unitName}: opened ${formatProfileNumber(item.count)}/${formatProfileNumber(item.seen)} games when in opening roll`;
    }

    return `${item.unitName}: built ${formatProfileNumber(item.count)}/${formatProfileNumber(item.seen)} games when rolled`;
  }

  return `${item.unitName} (${formatProfileNumber(item.count)})`;
}

function ProfileModeList({ modes }: { modes: PlayerModeStat[] }) {
  if (modes.length === 0) {
    return null;
  }

  const visibleModes = uniqueProfileModes(modes).slice(0, 3);

  return (
    <section className="profile-section">
      <h3>W3C ladders</h3>
      <div className="profile-mode-list">
        {visibleModes.map((mode) => (
          <div className="profile-mode-row" key={mode.gameMode}>
            <span>{mode.label}</span>
            <strong>{formatProfileNumber(mode.mmr)}</strong>
            <small>
              {mode.wins}-{mode.losses} ({formatProfilePercent(mode.winrate)})
            </small>
          </div>
        ))}
      </div>
    </section>
  );
}

function uniqueProfileModes(modes: PlayerModeStat[]) {
  const modesByGameMode = new Map<number, PlayerModeStat>();

  for (const mode of modes) {
    const existing = modesByGameMode.get(mode.gameMode);

    if (!existing || mode.games > existing.games || (mode.games === existing.games && (mode.mmr ?? 0) > (existing.mmr ?? 0))) {
      modesByGameMode.set(mode.gameMode, mode);
    }
  }

  return [...modesByGameMode.values()];
}

function formatRivalryScope(rivalries: PlayerRivalries, activeGroup: PlayerRivalryGroup = rivalries) {
  const matchCount =
    activeGroup.matchCount && activeGroup.matchCount > 0 ? ` · ${formatProfileNumber(activeGroup.matchCount)} W3C games` : "";

  if (rivalries.seasons.length === 0) {
    return `Past 5 seasons${matchCount}`;
  }

  return `Seasons ${rivalries.seasons.slice(0, 5).join(", ")}${matchCount}`;
}

type ProfileRivalrySort = "games" | "wins" | "winrate" | "lossrate";

function rivalryWinrate(rivalry: PlayerRivalry) {
  const games = rivalry.wins + rivalry.losses;
  return games > 0 ? rivalry.wins / games : 0;
}

function rivalryLossrate(rivalry: PlayerRivalry) {
  const games = rivalry.wins + rivalry.losses;
  return games > 0 ? rivalry.losses / games : 0;
}

function sortProfileRivalries(items: PlayerRivalry[], sortBy: ProfileRivalrySort) {
  return items.slice().sort((a, b) => {
    if (sortBy === "games") {
      return b.games - a.games || b.wins + b.losses - (a.wins + a.losses) || a.name.localeCompare(b.name);
    }

    if (sortBy === "wins") {
      return b.wins - a.wins || b.games - a.games || a.name.localeCompare(b.name);
    }

    if (sortBy === "lossrate") {
      return rivalryLossrate(b) - rivalryLossrate(a) || b.losses - a.losses || b.games - a.games || a.name.localeCompare(b.name);
    }

    return rivalryWinrate(b) - rivalryWinrate(a) || b.wins - a.wins || b.games - a.games || a.name.localeCompare(b.name);
  });
}

function ProfileRivalryList({
  items,
  onOpenProfile,
  sortBy,
  title
}: {
  items: PlayerRivalry[];
  onOpenProfile: (battleTag: string) => void;
  sortBy: ProfileRivalrySort;
  title: string;
}) {
  if (items.length === 0) {
    return null;
  }

  const sortedItems = sortProfileRivalries(items, sortBy);

  return (
    <div className="profile-rivalry-card">
      <h4>{title}</h4>
      <div className="profile-rivalry-list">
        {sortedItems.map((rivalry) => (
          <div className="profile-rivalry-row" key={rivalry.battleTag}>
            <button
              className="profile-rivalry-player"
              type="button"
              title={rivalry.battleTag}
              onClick={() => onOpenProfile(rivalry.battleTag)}
            >
              {rivalry.name}
            </button>
            <span>{formatProfileNumber(rivalry.games)} games</span>
            <strong>
              {rivalry.wins}-{rivalry.losses}
            </strong>
            <small>{formatProfilePercent(rivalry.winrate)}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileRivalries({
  onOpenProfile,
  rivalries
}: {
  onOpenProfile: (battleTag: string) => void;
  rivalries?: PlayerRivalries;
}) {
  const [selectedMode, setSelectedMode] = React.useState("all");

  React.useEffect(() => {
    setSelectedMode("all");
  }, [rivalries]);

  if (
    !rivalries ||
    (rivalries.mostPlayed.length === 0 &&
      rivalries.mostDefeated.length === 0 &&
      rivalries.bestWinrate.length === 0 &&
      rivalries.toughest.length === 0 &&
      (rivalries.teammatesMostPlayed?.length ?? 0) === 0 &&
      (rivalries.teammatesBestWinrate?.length ?? 0) === 0)
  ) {
    return null;
  }

  const availableModes = rivalries.modes?.filter((mode) => (mode.matchCount ?? 0) > 0) ?? [];
  const selectedModeData = availableModes.find((mode) => String(mode.gameMode) === selectedMode) ?? null;
  const activeGroup = selectedModeData ?? rivalries;

  return (
    <section className="profile-section profile-rivalries-section">
      <div className="profile-section-heading">
        <h3>Top rivalries</h3>
        <div className="profile-rivalry-controls">
          {availableModes.length > 1 ? (
            <label className="profile-rivalry-mode-select">
              <select
                aria-label="Rivalry mode"
                value={selectedMode}
                onChange={(event) => setSelectedMode(event.target.value)}
              >
                <option value="all">All Legion modes</option>
                {availableModes.map((mode) => (
                  <option key={mode.gameMode} value={mode.gameMode}>
                    {mode.label}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" size={15} strokeWidth={1.9} />
            </label>
          ) : null}
          <span>{formatRivalryScope(rivalries, activeGroup)}</span>
        </div>
      </div>
      <div className="profile-rivalries-grid">
        <ProfileRivalryList
          title="Played against most"
          items={activeGroup.mostPlayed}
          sortBy="games"
          onOpenProfile={onOpenProfile}
        />
        <ProfileRivalryList title="Defeated most" items={activeGroup.mostDefeated} sortBy="wins" onOpenProfile={onOpenProfile} />
        <ProfileRivalryList
          title="Best winrate vs"
          items={activeGroup.bestWinrate}
          sortBy="winrate"
          onOpenProfile={onOpenProfile}
        />
        <ProfileRivalryList
          title="Lowest winrate vs"
          items={activeGroup.toughest}
          sortBy="lossrate"
          onOpenProfile={onOpenProfile}
        />
        <ProfileRivalryList
          title="Played with most"
          items={activeGroup.teammatesMostPlayed ?? []}
          sortBy="games"
          onOpenProfile={onOpenProfile}
        />
        <ProfileRivalryList
          title="Best teammate WR"
          items={activeGroup.teammatesBestWinrate ?? []}
          sortBy="winrate"
          onOpenProfile={onOpenProfile}
        />
      </div>
    </section>
  );
}

function recentGameResultLabel(result: RecentGame["result"]) {
  if (result === "win") {
    return "Win";
  }

  if (result === "loss") {
    return "Loss";
  }

  return "Unknown";
}

function oppositeRecentGameResult(result: RecentGame["result"]): RecentGame["result"] {
  if (result === "win") {
    return "loss";
  }

  if (result === "loss") {
    return "win";
  }

  return "unknown";
}

function recentGameTeams(game: RecentGame, profile: Pick<PlayerProfilePayload, "battleTag" | "name">) {
  if (Array.isArray(game.teams) && game.teams.length >= 2) {
    return game.teams;
  }

  const profileTeamId = game.profileTeamId ?? 0;
  const opponentTeamId = profileTeamId === 0 ? 1 : 0;
  const teams: RecentGameTeam[] = [
    {
      id: profileTeamId,
      result: game.result,
      players: [
        {
          id: -1,
          battleTag: profile.battleTag,
          name: profile.name,
          isProfilePlayer: true
        },
        ...game.teammates.map((name, index) => ({
          id: index,
          battleTag: null,
          name
        }))
      ]
    },
    {
      id: opponentTeamId,
      result: oppositeRecentGameResult(game.result),
      players: game.opponents.map((name, index) => ({
        id: index,
        battleTag: null,
        name
      }))
    }
  ];

  return teams.sort((a, b) => a.id - b.id);
}

function ProfileRecentTeam({
  onOpenProfile,
  team
}: {
  onOpenProfile: (battleTag: string) => void;
  team: RecentGameTeam;
}) {
  const players =
    team.players.length > 0
      ? team.players
      : [
          {
            id: -1,
            battleTag: null,
            name: "Unknown"
          }
        ];

  return (
    <div className="profile-recent-team" data-result={team.result}>
      {players.map((player, index) =>
        player.battleTag ? (
          <button
            className="profile-recent-player"
            data-self={player.isProfilePlayer ? "true" : undefined}
            key={`${player.id}-${player.battleTag}-${index}`}
            title={player.battleTag}
            type="button"
            onClick={() => onOpenProfile(player.battleTag ?? "")}
          >
            {player.name}
          </button>
        ) : (
          <span
            className="profile-recent-player"
            data-self={player.isProfilePlayer ? "true" : undefined}
            key={`${player.id}-${player.name}-${index}`}
            title={player.name}
          >
            {player.name}
          </span>
        )
      )}
    </div>
  );
}

function ProfileRecentGames({
  games,
  onOpenProfile,
  onOpenViewer,
  profile
}: {
  games: RecentGame[];
  onOpenProfile: (battleTag: string) => void;
  onOpenViewer: (game: RecentGame) => void;
  profile: Pick<PlayerProfilePayload, "battleTag" | "name">;
}) {
  if (games.length === 0) {
    return null;
  }

  return (
    <section className="profile-section profile-recent-section">
      <h3>Recent games</h3>
      <div className="profile-recent-games">
        {games.slice(0, 5).map((game) => {
          const teams = recentGameTeams(game, profile);

          return (
            <article className="profile-recent-row" data-result={game.result} key={game.id}>
              <div className="profile-recent-teams">
                <ProfileRecentTeam team={teams[0]} onOpenProfile={onOpenProfile} />
                <div className="profile-recent-versus" aria-label="versus">
                  VS
                </div>
                <ProfileRecentTeam team={teams[1]} onOpenProfile={onOpenProfile} />
              </div>
              <div className="profile-recent-meta">
                <strong>{recentGameResultLabel(game.result)}</strong>
                <span>
                  {formatTeamSize(game.mode)} {formatGameMode(game.gameMode)}
                </span>
                <small>
                  {formatProfileDate(game.startedAt)} · {game.duration}
                </small>
              </div>
              <button
                className="profile-recent-viewer-button"
                type="button"
                title="Open online viewer"
                aria-label={`Open online viewer for ${game.matchId}`}
                onClick={() => onOpenViewer(game)}
              >
                <Eye aria-hidden="true" size={22} strokeWidth={1.8} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PlayerProfilePopover({
  battleTag,
  onClose,
  onOpenProfile,
  onOpenViewer
}: {
  battleTag: string | null;
  onClose: () => void;
  onOpenProfile: (battleTag: string) => void;
  onOpenViewer: (game: RecentGame) => void;
}) {
  const [profile, setProfile] = React.useState<PlayerProfilePayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedSeason, setSelectedSeason] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!battleTag) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      setSelectedSeason(null);
      return undefined;
    }

    const selectedBattleTag = battleTag;
    const controller = new AbortController();
    let isCurrent = true;

    async function loadProfile() {
      setIsLoading(true);
      setError(null);
      setProfile(null);

      try {
        const params = new URLSearchParams({ battleTag: selectedBattleTag });
        const response = await fetch(`/api/player-profile?${params.toString()}`, { signal: controller.signal });
        const data = (await response.json()) as PlayerProfilePayload & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load profile");
        }

        if (isCurrent) {
          setProfile(data);
          setSelectedSeason(data.selectedSeason ?? data.w3c.season ?? data.seasons[0]?.season ?? null);
        }
      } catch (requestError) {
        if (isCurrent && !(requestError instanceof DOMException && requestError.name === "AbortError")) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load profile");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [battleTag]);

  React.useEffect(() => {
    if (!battleTag) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [battleTag, onClose]);

  if (!battleTag) {
    return null;
  }

  const activeSeason = profile?.seasons.find((season) => season.season === selectedSeason) ?? profile?.seasons[0] ?? null;
  const activeLocal = activeSeason?.local ?? profile?.local;
  const activeModes = activeSeason?.modes ?? profile?.w3c.modes ?? [];
  const activeCurrent = activeSeason?.current ?? profile?.w3c.current;
  const activeSeasonNumber = activeSeason?.season ?? profile?.w3c.season ?? null;
  const current = activeCurrent;
  const topPercent = formatTopPercent(current?.topPercent);
  const seasonRange = formatProfileDateRange(activeSeason?.startedAt, activeSeason?.endedAt);

  return (
    <div className="player-profile-layer" role="presentation" onMouseDown={onClose}>
      <aside
        className="player-profile-popover"
        role="dialog"
        aria-modal="true"
        aria-label={`Player profile for ${profile?.name ?? battleTag}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="player-profile-close" type="button" onClick={onClose} aria-label="Close player profile">
          <X aria-hidden="true" size={24} strokeWidth={2.1} />
        </button>

        {isLoading ? <div className="profile-loading">Loading profile...</div> : null}
        {error ? <div className="profile-loading profile-loading-error">{error}</div> : null}

        {profile ? (
          <>
            <header className="profile-header">
              <div>
                <h2>{profile.name}</h2>
                <p>{profile.battleTag}</p>
              </div>
              <div className="profile-header-actions">
                {profile.seasons.length > 1 ? (
                  <label className="profile-season-select">
                    <span>Season</span>
                    <select
                      aria-label="Profile season"
                      value={selectedSeason ?? ""}
                      onChange={(event) => setSelectedSeason(Number(event.target.value))}
                    >
                      {profile.seasons.map((season) => (
                        <option key={season.season} value={season.season}>
                          {season.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown aria-hidden="true" size={16} strokeWidth={1.9} />
                  </label>
                ) : null}
                <a href={profile.w3cProfileUrl} target="_blank" rel="noreferrer" aria-label={`${profile.name} on w3champions`}>
                  W3C
                  <ExternalLink aria-hidden="true" size={15} strokeWidth={1.9} />
                </a>
              </div>
            </header>

            <div className="profile-stat-grid">
              <ProfileStat label="W3C MMR" tone="accent" value={formatProfileNumber(current?.mmr)} />
              <ProfileStat label="W3C Rank" value={current?.rank ? `#${formatProfileNumber(current.rank)}` : "-"} />
              <ProfileStat label="W3C W/L" value={current ? `${current.wins}-${current.losses}` : "-"} />
              <ProfileStat label="W3C Winrate" tone="good" value={formatProfilePercent(current?.winrate)} />
              <ProfileStat label="W3C Games" value={formatProfileNumber(current?.games)} />
              <ProfileStat label="Avg Value" value={formatProfileNumber(activeLocal?.averageValue)} />
              <ProfileStat label="Avg Income" value={formatProfileNumber(activeLocal?.averageIncome)} />
            </div>

            <div className="profile-meta-line">
              <span>Season {activeSeasonNumber ?? "-"}</span>
              {seasonRange ? <span>{seasonRange}</span> : null}
              {topPercent ? <span>{topPercent}</span> : null}
              <span>Last w3champions game {formatProfileDate(activeLocal?.lastGameAt)}</span>
            </div>

            <div className="profile-columns">
              <div>
                <ProfileModeList modes={activeModes} />
              </div>
              <div>
                <ProfileUnitStrip title="Favorites" items={activeLocal?.favoriteRolls ?? []} />
                <ProfileUnitStrip title="Opening units" items={activeLocal?.favoriteOpeners ?? []} />
              </div>
            </div>

            <ProfileRivalries rivalries={profile.rivalries} onOpenProfile={onOpenProfile} />

            <ProfileRecentGames
              games={activeLocal?.recentGames ?? []}
              onOpenProfile={onOpenProfile}
              onOpenViewer={onOpenViewer}
              profile={profile}
            />

            {activeSeason?.fetchError || profile.fetchError ? <p className="profile-warning">{activeSeason?.fetchError ?? profile.fetchError}</p> : null}
          </>
        ) : null}
      </aside>
    </div>
  );
}

function FilterSelect({
  ariaLabel,
  options,
  value,
  onChange
}: {
  ariaLabel: string;
  options: GameModeOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-select">
      <select aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.label} value={option.label}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" size={18} strokeWidth={1.9} />
    </label>
  );
}

function PlayerSearchBox({
  onChange,
  value
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="player-search-box">
      <Search aria-hidden="true" size={18} strokeWidth={1.9} />
      <input
        aria-label="Search player"
        autoComplete="off"
        placeholder="Search player"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button type="button" onClick={() => onChange("")} aria-label="Clear player search">
          <X aria-hidden="true" size={17} strokeWidth={2} />
        </button>
      ) : null}
    </label>
  );
}

function ReplayTable({
  emptyMessage,
  error,
  isLoading,
  onOpenProfile,
  onOpenViewer,
  onRetry,
  replays
}: {
  emptyMessage: string;
  error?: string | null;
  isLoading?: boolean;
  onOpenProfile: (battleTag: string) => void;
  onOpenViewer: (replay: Replay) => void;
  onRetry?: () => void;
  replays: Replay[];
}) {
  return (
    <div className="replay-list">
      <div className="replay-header" aria-hidden="true">
        <span>Players</span>
        <span>Game Mode</span>
        <span>Version</span>
        <span>Start time</span>
        <span>Duration</span>
        <span>Viewer</span>
      </div>
      {isLoading && replays.length === 0 ? <div className="replay-status">Loading games...</div> : null}
      {error ? (
        <div className="replay-status replay-status-error">
          <span>{error}</span>
          {onRetry ? (
            <button type="button" onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      ) : null}
      {!isLoading && !error && replays.length === 0 ? <div className="replay-status">{emptyMessage}</div> : null}
      {!error
        ? replays.map((replay) => (
            <ReplayRow key={replay.id} replay={replay} onOpenProfile={onOpenProfile} onOpenViewer={onOpenViewer} />
          ))
        : null}
    </div>
  );
}

function PaginationControl({
  currentPage,
  isLoading,
  onPageChange,
  pageCount
}: {
  currentPage: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  pageCount: number;
}) {
  return (
    <div className="pagination">
      <button
        className="icon-button pager-button"
        type="button"
        title="Previous page"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={isLoading || currentPage === 1}
      >
        <ChevronLeft aria-hidden="true" size={22} />
      </button>
      <span>
        Page {currentPage} of {pageCount}
      </span>
      <button
        className="icon-button pager-button"
        type="button"
        title="Next page"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={isLoading || currentPage === pageCount}
      >
        <ChevronRight aria-hidden="true" size={22} />
      </button>
    </div>
  );
}

function PlayerSearchResults({
  groups,
  isLoading,
  onGroupPageChange,
  onOpenProfile,
  onOpenViewer,
  query
}: {
  groups: PlayerSearchGroup[];
  isLoading: boolean;
  onGroupPageChange: (group: PlayerSearchGroup, page: number) => void;
  onOpenProfile: (battleTag: string) => void;
  onOpenViewer: (replay: Replay) => void;
  query: string;
}) {
  if (groups.length === 0) {
    return <div className="replay-status player-search-empty">No games found for {query}.</div>;
  }

  return (
    <div className="player-search-results">
      {groups.map((group) => (
        <section className="player-search-group" key={group.id} aria-label={`${formatTeamSize(group.mode)} ${formatGameMode(group.gameMode)} games`}>
          <div className="player-search-group-heading">
            <div>
              <h2>
                {formatTeamSize(group.mode)} <span>{formatGameMode(group.gameMode)}</span>
              </h2>
              <p>
                {group.count} {group.count === 1 ? "game" : "games"} for {query}
              </p>
            </div>
          </div>
          <ReplayTable
            emptyMessage={`No ${formatTeamSize(group.mode)} ${formatGameMode(group.gameMode)} games found for ${query}.`}
            isLoading={isLoading}
            onOpenProfile={onOpenProfile}
            onOpenViewer={onOpenViewer}
            replays={group.replays}
          />
          <PaginationControl
            currentPage={group.page}
            isLoading={isLoading}
            onPageChange={(page) => onGroupPageChange(group, page)}
            pageCount={group.pageCount}
          />
        </section>
      ))}
    </div>
  );
}

function GamesView() {
  const gamesTopRef = React.useRef<HTMLElement>(null);
  const [page, setPage] = React.useState(1);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [selectedMode, setSelectedMode] = React.useState<string | null>(null);
  const [selectedGameMode, setSelectedGameMode] = React.useState<string | null>(null);
  const [playerSearchInput, setPlayerSearchInput] = React.useState("");
  const [playerQuery, setPlayerQuery] = React.useState("");
  const [playerGroupPages, setPlayerGroupPages] = React.useState<Record<string, number>>({});
  const [payload, setPayload] = React.useState<GamesPayload | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [viewerSession, setViewerSession] = React.useState<ViewerSession | null>(null);
  const [profileBattleTag, setProfileBattleTag] = React.useState<string | null>(null);
  const viewerReplayGameIdRef = React.useRef<string | null>(null);
  const lastViewerSeekRef = React.useRef<string | null>(null);

  const openViewerSession = React.useCallback((replayGameId: string, title: string, layer: ViewerSession["layer"]) => {
    const session = {
      replayGameId,
      initialSeekSeconds: 0,
      layer,
      title
    };

    writeViewerUrl(replayGameId, "0", "push");
    viewerReplayGameIdRef.current = replayGameId;
    lastViewerSeekRef.current = "0";
    setViewerSession(session);
  }, []);

  const openViewer = React.useCallback(
    (replay: Replay) => {
      openViewerSession(String(replay.id), replay.matchId, "page");
    },
    [openViewerSession]
  );

  const openProfileRecentViewer = React.useCallback(
    (game: RecentGame) => {
      openViewerSession(String(game.id), game.matchId, "profile");
    },
    [openViewerSession]
  );

  const closeViewer = React.useCallback(() => {
    removeViewerUrl();
    viewerReplayGameIdRef.current = null;
    lastViewerSeekRef.current = null;
    setViewerSession(null);
  }, []);

  const syncViewerTime = React.useCallback((replayGameId: string, timeMillis: number) => {
    if (!viewerReplayGameIdRef.current) {
      return;
    }

    if (viewerReplayGameIdRef.current !== replayGameId) {
      viewerReplayGameIdRef.current = replayGameId;
      lastViewerSeekRef.current = null;
    }

    const seekSeconds = formatSeekSeconds(timeMillis);

    if (seekSeconds === lastViewerSeekRef.current) {
      return;
    }

    lastViewerSeekRef.current = seekSeconds;
    writeViewerUrl(replayGameId, seekSeconds, "replace");
  }, []);

  React.useEffect(() => {
    const initialSession = viewerSessionFromLocation();
    const initialSeekSeconds = initialSession ? formatSeekSeconds(initialSession.initialSeekSeconds * 1000) : null;

    viewerReplayGameIdRef.current = initialSession?.replayGameId ?? null;
    lastViewerSeekRef.current = initialSeekSeconds;
    setViewerSession(initialSession);

    if (initialSession && initialSeekSeconds !== null) {
      writeViewerUrl(initialSession.replayGameId, initialSeekSeconds, "replace");
    }

    function handlePopState() {
      const session = viewerSessionFromLocation();

      viewerReplayGameIdRef.current = session?.replayGameId ?? null;
      lastViewerSeekRef.current = session ? formatSeekSeconds(session.initialSeekSeconds * 1000) : null;
      setViewerSession(session);
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      const nextQuery = playerSearchInput.trim();
      const searchableQuery = nextQuery.length >= playerSearchMinimumCharacters ? nextQuery : "";

      setPage(1);
      setPlayerGroupPages({});
      setPlayerQuery(searchableQuery);
    }, 350);

    return () => {
      window.clearTimeout(handle);
    };
  }, [playerSearchInput]);

  React.useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    async function loadGames() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize)
        });

        if (selectedMode) {
          params.set("mode", selectedMode);
        }

        if (selectedGameMode) {
          params.set("gameMode", selectedGameMode);
        }

        if (playerQuery) {
          params.set("player", playerQuery);
          params.set("groupPages", JSON.stringify(playerGroupPages));
        }

        const response = await fetch(`/api/games?${params.toString()}`, {
          signal: controller.signal
        });
        const data = (await response.json()) as GamesPayload & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load games");
        }

        if (isCurrent) {
          setPayload(data);
          if (data.page !== page) {
            setPage(data.page);
          }
        }
      } catch (requestError) {
        if (isCurrent && !(requestError instanceof DOMException && requestError.name === "AbortError")) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load games");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadGames();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [page, reloadKey, selectedMode, selectedGameMode, playerQuery, playerGroupPages]);

  const pageItems = payload?.replays ?? [];
  const currentPage = payload?.page ?? page;
  const pageCount = payload?.pageCount ?? 1;
  const modeOptions = payload?.modes ?? [];
  const gameModeOptions = payload?.gameModes ?? [];
  const isPlayerSearchActive = playerQuery.length > 0;
  const playerSearchResult = payload?.playerSearch?.query === playerQuery ? payload.playerSearch : null;

  function selectMode(mode: string) {
    setPage(1);
    setSelectedMode(mode);
    setSelectedGameMode(null);
  }

  function selectGameMode(gameMode: string) {
    setPage(1);
    setSelectedGameMode(gameMode);
  }

  function scrollToGamesTop() {
    const element = gamesTopRef.current;

    if (!element) {
      return;
    }

    const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
    const top = element.getBoundingClientRect().top + window.scrollY - headerHeight - 18;

    window.scrollTo({
      behavior: "auto",
      top: Math.max(0, top)
    });
  }

  function goToPage(nextPage: number) {
    const safePage = Math.min(pageCount, Math.max(1, nextPage));

    if (safePage === currentPage) {
      return;
    }

    setPage(safePage);
    scrollToGamesTop();
  }

  function goToPlayerGroupPage(group: PlayerSearchGroup, nextPage: number) {
    const safePage = Math.min(group.pageCount, Math.max(1, nextPage));

    if (safePage === group.page) {
      return;
    }

    setPlayerGroupPages((pages) => ({
      ...pages,
      [group.id]: safePage
    }));
    scrollToGamesTop();
  }

  return (
    <>
      <section className="view games-view" aria-labelledby="games-title" ref={gamesTopRef}>
        <div className="section-heading">
          <div>
            <h1 id="games-title">Games</h1>
            <p>
              {payload ? (
                <>
                  Check out games played on{" "}
                  <a href="https://w3champions.com" target="_blank" rel="noreferrer">
                    w3champions
                  </a>
                  .
                </>
              ) : (
                "Loading games."
              )}
            </p>
          </div>
        </div>

        <div className="games-filters">
          {modeOptions.length > 0 ? (
            <FilterSelect
              ariaLabel="Team size"
              options={modeOptions}
              value={payload?.mode ?? selectedMode ?? modeOptions[0].label}
              onChange={selectMode}
            />
          ) : null}
          {gameModeOptions.length > 0 ? (
            <FilterSelect
              ariaLabel="Mode"
              options={gameModeOptions}
              value={payload?.gameMode ?? selectedGameMode ?? gameModeOptions[0].label}
              onChange={selectGameMode}
            />
          ) : null}
          <PlayerSearchBox value={playerSearchInput} onChange={setPlayerSearchInput} />
        </div>

        {isPlayerSearchActive ? (
          error ? (
            <ReplayTable
              emptyMessage={`No games found for ${playerQuery}.`}
              error={error}
              onOpenProfile={setProfileBattleTag}
              onOpenViewer={openViewer}
              onRetry={() => setReloadKey((value) => value + 1)}
              replays={[]}
            />
          ) : playerSearchResult ? (
            <PlayerSearchResults
              groups={playerSearchResult.groups}
              isLoading={isLoading}
              onGroupPageChange={goToPlayerGroupPage}
              onOpenProfile={setProfileBattleTag}
              onOpenViewer={openViewer}
              query={playerSearchResult.query}
            />
          ) : (
            <ReplayTable
              emptyMessage={`No games found for ${playerQuery}.`}
              isLoading={isLoading}
              onOpenProfile={setProfileBattleTag}
              onOpenViewer={openViewer}
              replays={[]}
            />
          )
        ) : (
          <>
            <ReplayTable
              emptyMessage={formatEmptyGamesMessage(payload?.mode, payload?.gameMode)}
              error={error}
              isLoading={isLoading && !payload}
              onOpenProfile={setProfileBattleTag}
              onOpenViewer={openViewer}
              onRetry={() => setReloadKey((value) => value + 1)}
              replays={pageItems}
            />

            <PaginationControl
              currentPage={currentPage}
              isLoading={isLoading}
              onPageChange={goToPage}
              pageCount={pageCount}
            />
          </>
        )}
      </section>
      <PlayerProfilePopover
        battleTag={profileBattleTag}
        onClose={() => setProfileBattleTag(null)}
        onOpenProfile={setProfileBattleTag}
        onOpenViewer={openProfileRecentViewer}
      />
      <ReplayViewerModal
        viewer={viewerSession}
        onClose={closeViewer}
        onOpenProfile={setProfileBattleTag}
        onTimeChange={syncViewerTime}
      />
    </>
  );
}

function TheGameView() {
  return (
    <section className="view split-view" aria-labelledby="game-title">
      <div className="section-heading">
        <div>
          <h1 id="game-title">Map</h1>
          <p>Warcraft III custom game, builder defense, king pressure, and coordinated sends.</p>
        </div>
      </div>
      <div className="feature-layout">
        <img className="map-preview" src="/assets/minimap.png" alt="Legion TD minimap" />
        <div className="copy-stack">
          <p>
            <b>Legion TD</b> is a Warcraft III custom game where teams build units to defend their mighty Kings against
            waves of demonic creatures.
          </p>
          <p>
            It features numerous game modes, including builder modes, varying difficulty levels, and optional levels.
          </p>
          <div className="link-list">
            <AppLink href="https://maps.w3reforged.com/featured-maps/legion-td-team-oze">
              Download the latest map
            </AppLink>
            <AppLink href="https://wiki.team-oze.org">Open the Legion TD wiki</AppLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function StarterGuideModal({ guide, onClose }: { guide: StarterGuide | null; onClose: () => void }) {
  React.useEffect(() => {
    if (!guide) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [guide, onClose]);

  if (!guide) {
    return null;
  }

  return (
    <div className="starter-modal" role="dialog" aria-modal="true" aria-label={guide.title}>
      <div className="starter-modal-panel">
        <div className="starter-modal-media">
          <img src={`/guides/starters/${guide.file}`} alt={`${guide.title} starter build`} />
        </div>
        <div className="starter-modal-copy">
          <span className="guide-category" data-category={guide.category}>
            {guide.category}
          </span>
          <h2>{guide.title}</h2>
          <p>{guide.note}</p>
        </div>
      </div>
      <button className="starter-modal-close" type="button" onClick={onClose} aria-label="Close starter build">
        <X aria-hidden="true" size={28} strokeWidth={2.2} />
      </button>
    </div>
  );
}

function StarterPackGuidesView() {
  const [activeTab, setActiveTab] = React.useState<GuideTab>("All");
  const [modalGuide, setModalGuide] = React.useState<StarterGuide | null>(null);
  const closeModal = React.useCallback(() => setModalGuide(null), []);
  const filteredGuides =
    activeTab === "All" ? starterGuides : starterGuides.filter((guide) => guide.category === activeTab);

  function countForTab(tab: GuideTab) {
    return tab === "All" ? starterGuides.length : starterGuides.filter((guide) => guide.category === tab).length;
  }

  return (
    <>
      <div className="guide-library-head">
        <h2>Starter Library</h2>
        <div className="guide-tabs" role="tablist" aria-label="Starter guide filters">
          {guideTabs.map((tab) => (
            <button
              aria-label={`${tab} (${countForTab(tab)})`}
              aria-selected={activeTab === tab}
              className={activeTab === tab ? "guide-tab guide-tab-active" : "guide-tab"}
              key={tab}
              onClick={() => setActiveTab(tab)}
              role="tab"
              type="button"
            >
              {tab}
              <span>{countForTab(tab)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="starter-grid">
        {filteredGuides.map((guide) => (
          <button className="starter-card" key={guide.id} onClick={() => setModalGuide(guide)} type="button">
            <span className="guide-category" data-category={guide.category}>
              {guide.category}
            </span>
            <span className="starter-thumb">
              <img src={`/guides/starters/${guide.file}`} alt="" loading="lazy" />
            </span>
            <span className="starter-title">{guide.title}</span>
          </button>
        ))}
      </div>

      <StarterGuideModal guide={modalGuide} onClose={closeModal} />
    </>
  );
}

function LevelOneBuildGrid({ play, selectedUnitType }: { play: LevelOnePlay; selectedUnitType: string }) {
  const unitsByCell = new Map<string, LevelOneBuildUnit[]>();

  for (const unit of play.units) {
    const key = `${unit.row}:${unit.col}`;
    const units = unitsByCell.get(key) ?? [];
    units.push(unit);
    unitsByCell.set(key, units);
  }

  return (
    <div
      className="level-one-grid"
      style={{
        gridTemplateColumns: `repeat(${play.grid.cols}, minmax(22px, 1fr))`
      }}
      aria-label={`${play.player.name} level 1 build grid`}
    >
      {Array.from({ length: play.grid.rows * play.grid.cols }, (_, index) => {
        const row = Math.floor(index / play.grid.cols) + 1;
        const col = (index % play.grid.cols) + 1;
        const units = unitsByCell.get(`${row}:${col}`) ?? [];
        const unit = units[0];

        return (
          <span
            className={unit?.unitType === selectedUnitType ? "level-one-cell level-one-cell-selected" : "level-one-cell"}
            key={`${row}-${col}`}
            title={unit ? `${unit.unitName} @ ${Math.round(unit.locationX)}, ${Math.round(unit.locationY)}` : undefined}
          >
            {unit ? <img src={unit.iconPath} alt={unit.unitName} loading="lazy" /> : null}
            {units.length > 1 ? <span className="level-one-stack-count">{units.length}</span> : null}
          </span>
        );
      })}
    </div>
  );
}

function LevelOnePlayCard({ play, selectedUnitType }: { play: LevelOnePlay; selectedUnitType: string }) {
  const start = formatStartParts(play.startedAt);

  return (
    <article className="level-one-play-card">
      <div className="level-one-play-header">
        <div>
          <h3>
            {play.player.name} <span>({play.player.elo})</span>
          </h3>
          <p>
            {play.gameMode} | {start.date} {start.time}
          </p>
        </div>
        <dl>
          <div>
            <dt>Value</dt>
            <dd>{play.value}</dd>
          </div>
          <div>
            <dt>Income</dt>
            <dd>{play.income}</dd>
          </div>
        </dl>
      </div>

      <div className="level-one-roll" aria-label={`${play.player.name} level 1 roll`}>
        {play.roll.map((unit) => (
          <span className="level-one-roll-icon" key={`${play.id}-${unit.unitType}`} title={unit.unitName}>
            <img src={unit.iconPath} alt={unit.unitName} loading="lazy" />
          </span>
        ))}
      </div>

      <LevelOneBuildGrid play={play} selectedUnitType={selectedUnitType} />
    </article>
  );
}

function LevelOneGuidesView() {
  const [payload, setPayload] = React.useState<LevelOneGuidePayload | null>(null);
  const [selectedUnitType, setSelectedUnitType] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    async function loadLevelOneGuide() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/guides/level-one", {
          cache: "no-store",
          signal: controller.signal
        });
        const data = (await response.json()) as LevelOneGuidePayload & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Unable to load level 1 tower guide");
        }

        if (isCurrent) {
          setPayload(data);
          setSelectedUnitType((current) => current ?? data.units[0]?.unitType ?? null);
        }
      } catch (requestError) {
        if (isCurrent && !(requestError instanceof DOMException && requestError.name === "AbortError")) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load level 1 tower guide");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadLevelOneGuide();

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, []);

  const selectedUnit = payload?.units.find((unit) => unit.unitType === selectedUnitType) ?? payload?.units[0] ?? null;

  if (isLoading && !payload) {
    return <div className="guide-status">Loading level 1 tower guide...</div>;
  }

  if (error) {
    return <div className="guide-status guide-status-error">{error}</div>;
  }

  if (!payload || payload.units.length === 0) {
    const scope = payload ? `${payload.scope.mode} ${payload.scope.gameMode}` : "Legion TD 4v4 X3";

    return (
      <div className="guide-status">
        No level 1 tower plays from players over 1600 MMR were found for {scope}.
      </div>
    );
  }

  return (
    <div className="level-one-guide">
      <div className="level-one-summary">
        <p>
          {payload.scope.mode} {payload.scope.gameMode} only. Level 1 plays from {payload.highPlayerCount} players over{" "}
          {payload.minElo} MMR, grouped by the unique towers they had on the board at the end of level 1.
        </p>
        <dl>
          <div>
            <dt>Plays</dt>
            <dd>{payload.playCount}</dd>
          </div>
          <div>
            <dt>Units</dt>
            <dd>{payload.unitCount}</dd>
          </div>
        </dl>
      </div>

      <div className="level-one-unit-picker" aria-label="Level 1 tower units">
        {payload.units.map((unit) => (
          <button
            aria-pressed={selectedUnit?.unitType === unit.unitType}
            className={
              selectedUnit?.unitType === unit.unitType
                ? "level-one-unit-button level-one-unit-button-active"
                : "level-one-unit-button"
            }
            key={unit.unitType}
            onClick={() => setSelectedUnitType(unit.unitType)}
            title={`${unit.unitName} - ${unit.examplesCount} examples`}
            type="button"
          >
            <img src={unit.iconPath} alt="" loading="lazy" />
            <span>{unit.unitName}</span>
            <small>{unit.examplesCount}</small>
          </button>
        ))}
      </div>

      {selectedUnit ? (
        <div className="level-one-selected">
          <div className="level-one-selected-heading">
            <img src={selectedUnit.iconPath} alt="" />
            <div>
              <h2>{selectedUnit.unitName}</h2>
              <p>
                {selectedUnit.examplesCount} examples from {selectedUnit.playersCount} players.
              </p>
            </div>
          </div>
          <div className="level-one-play-grid">
            {selectedUnit.examples.map((play) => (
              <LevelOnePlayCard key={play.id} play={play} selectedUnitType={selectedUnit.unitType} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GuidesView() {
  const [guideMode, setGuideMode] = React.useState<GuideMode>("level-one");

  return (
    <section className="view guides-view" aria-labelledby="guides-title">
      <div className="section-heading">
        <div>
          <h1 id="guides-title">Guides</h1>
          <p>
            {guideMode === "level-one"
              ? "Level 1 tower choices from 4v4 X3 high-MMR replay data, with rolls and placement grids."
              : "Opening builds, unit positions, and setup patterns."}
          </p>
        </div>
      </div>

      <div className="guide-mode-toggle" role="tablist" aria-label="Guide type">
        <button
          aria-selected={guideMode === "starters"}
          className={guideMode === "starters" ? "guide-mode-button guide-mode-button-active" : "guide-mode-button"}
          onClick={() => setGuideMode("starters")}
          role="tab"
          type="button"
        >
          Starter Pack
        </button>
        <button
          aria-selected={guideMode === "level-one"}
          className={guideMode === "level-one" ? "guide-mode-button guide-mode-button-active" : "guide-mode-button"}
          onClick={() => setGuideMode("level-one")}
          role="tab"
          type="button"
        >
          Level 1 Towers Guide
        </button>
      </div>

      {guideMode === "level-one" ? <LevelOneGuidesView /> : <StarterPackGuidesView />}
    </section>
  );
}

function CommunityView() {
  return (
    <section className="view split-view" aria-labelledby="community-title">
      <div className="section-heading">
        <div>
          <h1 id="community-title">Community</h1>
          <p>Discord, streams, support, tournaments, and the wider Legion TD player base.</p>
        </div>
      </div>
      <div className="community-sections">
        <div className="feature-layout">
          <div className="banner-crest" data-race="human">
            <img src="/assets/social-menu-icon-resting.png" alt="" />
          </div>
          <div className="copy-stack">
            <p>Join the 11K+ LTD players out there to find friends and keep track of the latest news and development.</p>
            <div className="link-list">
              <AppLink href="https://team-oze.org/discord" className="discord-link">
                Join Discord
              </AppLink>
              <AppLink href="https://twitch.com/Team_OZE" className="twitch-link">
                Follow Twitch
              </AppLink>
              <AppLink href="https://patreon.com/teamoze" className="patreon-link">
                Support Patreon
              </AppLink>
            </div>
          </div>
        </div>

        <div className="community-event-band">
          <div className="copy-stack">
            <h2>Events</h2>
            <p>We hold a few tournaments a year in different formats and modes, from invitationals to open fun tours.</p>
            <p>
              Congratulations to <b>Team PrimeLegion</b> for winning the latest <b>Summer Brawl</b>.
            </p>
          </div>
          <div className="banner-crest" data-race="horde">
            <img src="/assets/tournament-icon-up.png" alt="" />
          </div>
        </div>
      </div>
    </section>
  );
}

function W3ChampionsView() {
  return (
    <section className="view split-view" aria-labelledby="w3c-title">
      <div className="section-heading">
        <div>
          <h1 id="w3c-title">W3Champions</h1>
          <p>Legion TD ladder, verified maps, matchmaking, moderation, and game statistics.</p>
        </div>
      </div>
      <div className="feature-layout">
        <div className="banner-crest" data-race="nightelf">
          <img src="/assets/crown-icon.png" alt="" />
        </div>
        <div className="copy-stack">
          <p>
            There is an official Legion TD ladder on <a href="https://w3champions.com">W3Champions</a>. It currently
            features <i>pracmi</i>, <i>phcc</i>, and <i>prccx3</i> modes.
          </p>
          <ul className="plain-list">
            <li>Verified and updated maps.</li>
            <li>A competitive ladder with server-stored stats.</li>
            <li>Moderation and report workflows for ladder games.</li>
            <li>Recorded games and performance statistics.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function ActiveView({ view }: { view: ViewId }) {
  if (view === "game") {
    return <TheGameView />;
  }
  if (view === "guides") {
    return <GuidesView />;
  }
  if (view === "community") {
    return <CommunityView />;
  }
  if (view === "w3champions") {
    return <W3ChampionsView />;
  }
  return <GamesView />;
}

export default function HomePage() {
  const [activeView, setActiveView] = React.useState<ViewId>("games");

  return (
    <>
      <header className="site-header">
        <div className="nav-inner">
          <button className="brand-button" type="button" onClick={() => setActiveView("games")}>
            <img src="/assets/oze-logo.svg" alt="Team OZE" />
          </button>
          <nav className="primary-nav" aria-label="Primary">
            {menuViews.map((view) => (
              <button
                className={activeView === view.id ? "nav-link nav-link-active" : "nav-link"}
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
              >
                {view.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="site-main">
        <div className="content-frame">
          <ActiveView view={activeView} />
        </div>
      </main>
    </>
  );
}
