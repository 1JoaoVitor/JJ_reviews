export type GuessStatus = "correct" | "close" | "wrong";

export interface GuessFieldResult {
  label: string;
  guessed: string;
  target: string;
  status: GuessStatus;
}

export interface GuessResult {
  guessTitle: string;
  fields: GuessFieldResult[];
  isCorrect: boolean;
}

export interface GameMovieProfile {
  tmdbId: number;
  title: string;
  releaseYear?: number;
  director?: string;
  genres: string[];
  countries: string[];
  cast: string[];
  runtime?: number;
  posterPath?: string;
}

export type DailySourceMode = "global_daily" | "my_watched" | "list_scope";

const COUNTRY_PTBR_MAP: Record<string, string> = {
  "united states": "Estados Unidos",
  "united kingdom": "Reino Unido",
  "south korea": "Coreia do Sul",
  "north korea": "Coreia do Norte",
  "japan": "Japao",
  "france": "Franca",
  "germany": "Alemanha",
  "italy": "Italia",
  "spain": "Espanha",
  "portugal": "Portugal",
  "brazil": "Brasil",
  "argentina": "Argentina",
  "mexico": "Mexico",
  "canada": "Canada",
  "china": "China",
  "taiwan": "Taiwan",
  "india": "India",
  "australia": "Australia",
  "new zealand": "Nova Zelandia",
  "sweden": "Suecia",
  "norway": "Noruega",
  "denmark": "Dinamarca",
  "netherlands": "Paises Baixos",
  "ireland": "Irlanda",
  "belgium": "Belgica",
  "switzerland": "Suica",
  "austria": "Austria",
  "russia": "Russia",
  "ukraine": "Ucrania",
  "poland": "Polonia",
  "turkey": "Turquia",
  "iran": "Ira",
};

function normalizeText(value?: string | null): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getListLabel(value: string[]): string {
  return value.length > 0 ? value.join(", ") : "Nao informado";
}

export function toPtBrCountry(name: string): string {
  const key = normalizeText(name);
  return COUNTRY_PTBR_MAP[key] || name;
}

export function normalizeCountriesToPtBr(countries: string[]): string[] {
  return countries.map(toPtBrCountry);
}

export function getYearDirectionHint(guessYear?: number, targetYear?: number): string {
  if (!guessYear || !targetYear || guessYear === targetYear) {
    return "";
  }

  return guessYear < targetYear ? " ↑ mais atual" : " ↓ mais antigo";
}

export function compareMovieProfiles(guess: GameMovieProfile, target: GameMovieProfile): GuessResult {
  const normGuessDirector = normalizeText(guess.director);
  const normTargetDirector = normalizeText(target.director);

  let directorStatus: GuessStatus = "wrong";
  if (normGuessDirector && normTargetDirector) {
    if (normGuessDirector === normTargetDirector) {
      directorStatus = "correct";
    } else if (normGuessDirector.includes(normTargetDirector) || normTargetDirector.includes(normGuessDirector)) {
      directorStatus = "close";
    }
  }

  let yearStatus: GuessStatus = "wrong";
  if (guess.releaseYear && target.releaseYear) {
    const diff = Math.abs(guess.releaseYear - target.releaseYear);
    yearStatus = diff === 0 ? "correct" : diff <= 5 ? "close" : "wrong";
  }

  const guessGenres = guess.genres.map(normalizeText);
  const targetGenres = target.genres.map(normalizeText);
  const genreStatus: GuessStatus = guessGenres.some((genre) => targetGenres.includes(genre))
    ? "correct"
    : guessGenres.some((genre) => targetGenres.some((targetGenre) => targetGenre.includes(genre) || genre.includes(targetGenre)))
      ? "close"
      : "wrong";

  const guessCountries = guess.countries.map(normalizeText);
  const targetCountries = target.countries.map(normalizeText);
  const matchesCount = targetCountries.filter((country) => guessCountries.includes(country)).length;
  const countryStatus: GuessStatus =
    targetCountries.length > 0 && matchesCount === targetCountries.length
      ? "correct"
      : matchesCount > 0
        ? "close"
        : "wrong";

  const guessCast = guess.cast.map(normalizeText);
  const targetCast = target.cast.map(normalizeText);
  const castMatches = targetCast.filter((actor) => guessCast.includes(actor)).length;
  const castStatus: GuessStatus =
    targetCast.length > 0 && castMatches === targetCast.length
      ? "correct"
      : castMatches > 0
        ? "close"
        : "wrong";

  let runtimeStatus: GuessStatus = "wrong";
  if (guess.runtime && target.runtime) {
    const diff = Math.abs(guess.runtime - target.runtime);
    runtimeStatus = diff <= 7 ? "correct" : diff <= 20 ? "close" : "wrong";
  }

  const yearDirectionHint = getYearDirectionHint(guess.releaseYear, target.releaseYear);

  const fields: GuessFieldResult[] = [
    {
      label: "Diretor",
      guessed: guess.director || "Nao informado",
      target: target.director || "Nao informado",
      status: directorStatus,
    },
    {
      label: "Ano",
      guessed: `${guess.releaseYear ? String(guess.releaseYear) : "Nao informado"}${yearDirectionHint}`,
      target: target.releaseYear ? String(target.releaseYear) : "Nao informado",
      status: yearStatus,
    },
    {
      label: "Genero",
      guessed: getListLabel(guess.genres),
      target: getListLabel(target.genres),
      status: genreStatus,
    },
    {
      label: "Paises",
      guessed: getListLabel(guess.countries),
      target: getListLabel(target.countries),
      status: countryStatus,
    },
    {
      label: "Ator/Atriz principal",
      guessed: getListLabel(guess.cast),
      target: getListLabel(target.cast),
      status: castStatus,
    },
    {
      label: "Duracao",
      guessed: guess.runtime ? `${guess.runtime} min` : "Nao informada",
      target: target.runtime ? `${target.runtime} min` : "Nao informada",
      status: runtimeStatus,
    },
  ];

  return {
    guessTitle: guess.title,
    fields,
    isCorrect: guess.tmdbId === target.tmdbId,
  };
}

export function buildGuessSummary(guesses: GuessResult[], lives: number) {
  const rank: Record<GuessStatus, number> = { wrong: 1, close: 2, correct: 3 };
  const bestByField = new Map<string, { status: GuessStatus; guessed: string }>();

  for (const guess of guesses) {
    for (const field of guess.fields) {
      const previous = bestByField.get(field.label);
      if (!previous || rank[field.status] > rank[previous.status]) {
        bestByField.set(field.label, { status: field.status, guessed: field.guessed });
      }
    }
  }

  return {
    attempts: guesses.length,
    livesLeft: lives,
    fields: Array.from(bestByField.entries()).map(([label, value]) => ({ label, ...value })),
  };
}

export function shouldUseTmdbSuggestions(source: DailySourceMode): boolean {
  return source === "global_daily";
}

export function getCoverRevealState(livesLeft: number, isWon: boolean, maxLives = 6) {
  const clampedLives = Math.max(0, Math.min(maxLives, livesLeft));
  const livesLost = maxLives - clampedLives;

  // Keep the grid smaller to maintain a chunkier pixelated look.
  const gridSize = 8;
  const totalTiles = gridSize * gridSize;
  const revealRatio = isWon ? 1 : livesLost / maxLives;

  const revealTiles = Math.round(totalTiles * revealRatio);
  const blurPx = isWon ? 0 : Math.max(0, 24 * (clampedLives / maxLives));
  const posterSize = isWon ? "w500" : clampedLives >= 5 ? "w92" : clampedLives >= 3 ? "w154" : clampedLives >= 1 ? "w342" : "w500";

  return { revealTiles, blurPx, posterSize, totalTiles, gridSize };
}
