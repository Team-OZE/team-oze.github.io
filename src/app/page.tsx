"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Download, ExternalLink, Eye } from "lucide-react";
import * as React from "react";

type Player = {
  id: number;
  battleTag: string;
  name: string;
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
  replayUrl: string | null;
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
};

type GameModeOption = {
  label: string;
  count: number;
};

const views = [
  { id: "games", label: "Games" },
  { id: "game", label: "Map" },
  { id: "events", label: "Events" },
  { id: "community", label: "Community" },
  { id: "w3champions", label: "W3Champions" }
] as const;

type ViewId = (typeof views)[number]["id"];

const pageSize = 8;

function formatStartParts(value: string) {
  const [datePart, timePart] = value.split(" ");
  const [year, month, day] = datePart.split("-");
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
    Number(month) - 1
  ];
  return {
    date: `${day}-${monthName}-${year}`,
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

function TeamPlayers({ team }: { team: Team }) {
  return (
    <div className={`team team-${team.result}`}>
      {team.players.map((player) => (
        <div className="player" key={player.id} title={player.battleTag}>
          <span className="player-mark" aria-hidden="true" />
          <span>{player.name}</span>
        </div>
      ))}
    </div>
  );
}

function ReplayRow({ replay }: { replay: Replay }) {
  const kingSpell = formatKingSpell(replay.kingSpell);
  const start = formatStartParts(replay.startedAt);

  return (
    <article className="replay-row">
      <div className="players-column">
        <TeamPlayers team={replay.teams[0]} />
        <div className="versus" aria-label="versus">
          VS
        </div>
        <TeamPlayers team={replay.teams[1]} />
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
        <button className="icon-button" type="button" title="Online viewer coming soon" aria-label="Open online viewer">
          <Eye aria-hidden="true" size={24} strokeWidth={1.8} />
        </button>
      </div>
      <div className="replay-column" data-label="Download">
        {replay.replayUrl ? (
          <a className="icon-button" href={replay.replayUrl} title="Download replay">
            <Download aria-hidden="true" size={24} strokeWidth={1.8} />
          </a>
        ) : (
          <button className="icon-button" type="button" title="Replay file not bundled" disabled>
            <Download aria-hidden="true" size={24} strokeWidth={1.8} />
          </button>
        )}
      </div>
    </article>
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

function GamesView() {
  const gamesTopRef = React.useRef<HTMLElement>(null);
  const [page, setPage] = React.useState(1);
  const [reloadKey, setReloadKey] = React.useState(0);
  const [selectedMode, setSelectedMode] = React.useState<string | null>(null);
  const [selectedGameMode, setSelectedGameMode] = React.useState<string | null>(null);
  const [payload, setPayload] = React.useState<GamesPayload | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
  }, [page, reloadKey, selectedMode, selectedGameMode]);

  const pageItems = payload?.replays ?? [];
  const currentPage = payload?.page ?? page;
  const pageCount = payload?.pageCount ?? 1;
  const modeOptions = payload?.modes ?? [];
  const gameModeOptions = payload?.gameModes ?? [];

  function selectMode(mode: string) {
    setPage(1);
    setSelectedMode(mode);
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

  return (
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

      {modeOptions.length > 0 || gameModeOptions.length > 0 ? (
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
        </div>
      ) : null}

      <div className="replay-list">
        <div className="replay-header" aria-hidden="true">
          <span>Players</span>
          <span>Game Mode</span>
          <span>Version</span>
          <span>Start time</span>
          <span>Duration</span>
          <span>Viewer</span>
          <span>Replay</span>
        </div>
        {isLoading && !payload ? <div className="replay-status">Loading games...</div> : null}
        {error ? (
          <div className="replay-status replay-status-error">
            <span>{error}</span>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)}>
              Retry
            </button>
          </div>
        ) : null}
        {!isLoading && !error && pageItems.length === 0 ? <div className="replay-status">No games found.</div> : null}
        {!error
          ? pageItems.map((replay) => <ReplayRow key={replay.id} replay={replay} />)
          : null}
      </div>

      <div className="pagination">
        <button
          className="icon-button pager-button"
          type="button"
          title="Previous page"
          onClick={() => goToPage(currentPage - 1)}
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
          onClick={() => goToPage(currentPage + 1)}
          disabled={isLoading || currentPage === pageCount}
        >
          <ChevronRight aria-hidden="true" size={22} />
        </button>
      </div>
    </section>
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

function EventsView() {
  return (
    <section className="view split-view" aria-labelledby="events-title">
      <div className="section-heading">
        <div>
          <h1 id="events-title">Events</h1>
          <p>Tournaments, invitational formats, open fun tours, and seasonal brawls.</p>
        </div>
      </div>
      <div className="feature-layout feature-layout-reverse">
        <div className="copy-stack">
          <p>We hold a few tournaments a year in different formats and modes, from invitationals to open fun tours.</p>
          <p>
            Congratulations to <b>Team PrimeLegion</b> for winning the latest <b>Summer Brawl</b>.
          </p>
        </div>
        <div className="banner-crest" data-race="horde">
          <img src="/assets/tournament-icon-up.png" alt="" />
        </div>
      </div>
    </section>
  );
}

function CommunityView() {
  return (
    <section className="view split-view" aria-labelledby="community-title">
      <div className="section-heading">
        <div>
          <h1 id="community-title">Community</h1>
          <p>Discord, streams, support, and the wider Legion TD player base.</p>
        </div>
      </div>
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
  if (view === "events") {
    return <EventsView />;
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
            {views.map((view) => (
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
