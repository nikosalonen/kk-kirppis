// Static, heavily-cached catalog of gaming platforms and their IGDB logo image
// ids. IGDB's platform set is stable, so this is committed rather than fetched —
// rendering a platform logo therefore costs ZERO IGDB API calls (important: the
// API rate limit is only 4 req/s). The seller picks a platform from a game's
// live IGDB platforms at create time; here we just map the stored string back to
// a logo at render time.
//
// `aliases` are matched case-insensitively against the stored `platform` string.
// They cover the IGDB slug, abbreviation, full name, and common free-text spellings
// so that BOTH new canonical picks AND legacy hand-typed values ("Switch", "PS5")
// resolve to the same logo. Platforms IGDB has no logo for (Mega Drive/Genesis,
// Master System, …) are simply omitted — they fall back to a plain text label.
//
// To refresh: query `/v4/platforms` with
// `fields name, abbreviation, slug, platform_logo.image_id; limit 500;`.

export type PlatformEntry = {
  // Short display label for the badge.
  label: string;
  // IGDB image_id of the platform logo (PNG on the IGDB image CDN).
  logoImageId: string;
  // Normalized-match strings (slug / abbreviation / name / common spellings).
  aliases: string[];
};

const PLATFORMS: PlatformEntry[] = [
  // --- Current & recent ---
  { label: "Switch", logoImageId: "plgu", aliases: ["switch", "nintendo switch"] },
  { label: "Switch 2", logoImageId: "plow", aliases: ["switch 2", "nintendo switch 2"] },
  { label: "PS5", logoImageId: "plos", aliases: ["ps5", "playstation 5"] },
  { label: "PS4", logoImageId: "pl6f", aliases: ["ps4", "playstation 4"] },
  { label: "Xbox Series", logoImageId: "plfl", aliases: ["series x|s", "xbox series x|s", "xbox series", "series x", "series s", "series x/s"] },
  { label: "Xbox One", logoImageId: "pl95", aliases: ["xone", "xbox one"] },
  { label: "PC", logoImageId: "plim", aliases: ["pc", "win", "windows", "pc (microsoft windows)"] },
  { label: "Mac", logoImageId: "plo3", aliases: ["mac", "macos"] },
  { label: "Linux", logoImageId: "plak", aliases: ["linux"] },

  // --- Modern handhelds ---
  { label: "3DS", logoImageId: "pln6", aliases: ["3ds", "nintendo 3ds"] },
  { label: "New 3DS", logoImageId: "pl6j", aliases: ["new 3ds", "new nintendo 3ds"] },
  { label: "DS", logoImageId: "pl6t", aliases: ["nds", "ds", "nintendo ds"] },
  { label: "DSi", logoImageId: "pl6u", aliases: ["dsi", "nintendo dsi"] },
  { label: "Vita", logoImageId: "pl6g", aliases: ["vita", "ps vita", "playstation vita"] },
  { label: "PSP", logoImageId: "pl5y", aliases: ["psp", "playstation portable"] },

  // --- Sony retro ---
  { label: "PS3", logoImageId: "tuyy1nrqodtmbqajp4jg", aliases: ["ps3", "playstation 3"] },
  { label: "PS2", logoImageId: "pl72", aliases: ["ps2", "playstation 2"] },
  { label: "PS1", logoImageId: "plmb", aliases: ["ps1", "ps", "psx", "playstation"] },

  // --- Xbox retro ---
  { label: "Xbox 360", logoImageId: "plha", aliases: ["x360", "xbox 360"] },
  { label: "Xbox", logoImageId: "pl7e", aliases: ["xbox"] },

  // --- Nintendo retro ---
  { label: "Wii U", logoImageId: "pl6n", aliases: ["wiiu", "wii u"] },
  { label: "Wii", logoImageId: "pl92", aliases: ["wii"] },
  { label: "GameCube", logoImageId: "pl7a", aliases: ["ngc", "gcn", "gamecube", "nintendo gamecube"] },
  { label: "N64", logoImageId: "pl78", aliases: ["n64", "nintendo 64"] },
  { label: "SNES", logoImageId: "ifw2tvdkynyxayquiyk4", aliases: ["snes", "super nintendo", "super nintendo entertainment system"] },
  { label: "Super Famicom", logoImageId: "a9x7xjy4p9sqynrvomcf", aliases: ["sfam", "super famicom"] },
  { label: "NES", logoImageId: "plmo", aliases: ["nes", "nintendo entertainment system", "famicom", "family computer"] },
  { label: "GBA", logoImageId: "pl74", aliases: ["gba", "game boy advance"] },
  { label: "GBC", logoImageId: "pl7l", aliases: ["gbc", "game boy color"] },
  { label: "Game Boy", logoImageId: "pl7m", aliases: ["gb", "game boy"] },
  { label: "Virtual Boy", logoImageId: "pl7s", aliases: ["virtualboy", "virtual boy"] },

  // --- Sega ---
  { label: "Dreamcast", logoImageId: "pl7i", aliases: ["dc", "dreamcast"] },
  { label: "Saturn", logoImageId: "hrmqljpwunky1all3v78", aliases: ["saturn", "sega saturn"] },
  { label: "Game Gear", logoImageId: "pl7z", aliases: ["game gear", "gamegear", "sega game gear"] },
  { label: "32X", logoImageId: "pl7r", aliases: ["sega32", "32x", "sega 32x"] },
  { label: "SG-1000", logoImageId: "plmn", aliases: ["sg1000", "sg-1000"] },

  // --- Atari ---
  { label: "Atari 2600", logoImageId: "pln4", aliases: ["atari2600", "atari 2600"] },
  { label: "Atari 5200", logoImageId: "pl8g", aliases: ["atari5200", "atari 5200"] },
  { label: "Atari 7800", logoImageId: "pl8f", aliases: ["atari7800", "atari 7800"] },
  { label: "Jaguar", logoImageId: "pl7y", aliases: ["jaguar", "atari jaguar"] },
  { label: "Lynx", logoImageId: "pl82", aliases: ["lynx", "atari lynx"] },
  { label: "Atari ST", logoImageId: "pla7", aliases: ["atari-st", "atari st", "atari st/ste"] },

  // --- Home computers ---
  { label: "C64", logoImageId: "pll3", aliases: ["c64", "commodore 64", "commodore c64/128/max"] },
  { label: "Amiga CD32", logoImageId: "pl7v", aliases: ["amiga cd32"] },
  { label: "MSX", logoImageId: "pl8j", aliases: ["msx"] },
  { label: "ZX Spectrum", logoImageId: "plab", aliases: ["zxs", "zx spectrum"] },
  { label: "Amstrad CPC", logoImageId: "plnh", aliases: ["acpc", "amstrad cpc"] },

  // --- NEC / SNK / Bandai / others ---
  { label: "TurboGrafx-16", logoImageId: "pl88", aliases: ["turbografx16", "turbografx-16", "pc engine", "turbografx-16/pc engine"] },
  { label: "SuperGrafx", logoImageId: "pla4", aliases: ["supergrafx", "pc engine supergrafx"] },
  { label: "Neo Geo", logoImageId: "hamfdrgnhenxb2d9g8mh", aliases: ["neogeoaes", "neo geo", "neo geo aes"] },
  { label: "Neo Geo Pocket Color", logoImageId: "pl7h", aliases: ["neo geo pocket color"] },
  { label: "WonderSwan", logoImageId: "pl7b", aliases: ["wonderswan"] },
  { label: "3DO", logoImageId: "pl7u", aliases: ["3do", "3do interactive multiplayer"] },
  { label: "N-Gage", logoImageId: "pl76", aliases: ["ngage", "n-gage"] },
  { label: "ColecoVision", logoImageId: "pl8n", aliases: ["colecovision"] },
  { label: "Intellivision", logoImageId: "pl8o", aliases: ["intellivision"] },

  // --- Mobile ---
  { label: "Android", logoImageId: "pln3", aliases: ["android"] },
  { label: "iOS", logoImageId: "pl6w", aliases: ["ios", "iphone", "ipad"] },
];

// IGDB serves platform logos as PNGs (transparent) from its image CDN.
// `logo_med` (~284px) is plenty for a badge and is heavily cacheable.
export function platformLogoUrl(logoImageId: string): string {
  return `https://images.igdb.com/igdb/image/upload/t_logo_med/${logoImageId}.png`;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

// Alias → entry lookup, built once. Later entries win on the rare alias clash.
const BY_ALIAS = new Map<string, PlatformEntry>();
for (const entry of PLATFORMS) {
  for (const alias of entry.aliases) BY_ALIAS.set(normalize(alias), entry);
}

export type ResolvedPlatform = { label: string; logoUrl: string | null };

// Resolve a stored platform string to a display label + (optional) logo. Unknown
// or empty values fall back to the raw string with no logo. Returns null only
// when there is no platform at all, so callers can render conditionally.
export function resolvePlatform(
  stored: string | null | undefined,
): ResolvedPlatform | null {
  const value = stored?.trim();
  if (!value) return null;
  const entry = BY_ALIAS.get(normalize(value));
  if (!entry) return { label: value, logoUrl: null };
  return { label: entry.label, logoUrl: platformLogoUrl(entry.logoImageId) };
}
