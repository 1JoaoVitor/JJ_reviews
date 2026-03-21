import { describe, expect, it } from "vitest";
import { GAME_HELP_MAP } from "../gameHelpContent";

describe("gameHelpContent", () => {
  it("expose ajuda para os tres modos jogaveis", () => {
    expect(Object.keys(GAME_HELP_MAP).sort()).toEqual(["battle", "daily_cover", "daily_riddle"]);
  });

  it("cada modo possui titulo e conteudo preenchidos", () => {
    expect(GAME_HELP_MAP.battle.title).toContain("Batalha");
    expect(GAME_HELP_MAP.daily_cover.title).toContain("Capa");
    expect(GAME_HELP_MAP.daily_riddle.title).toContain("Enigma");

    expect(GAME_HELP_MAP.battle.content.length).toBeGreaterThan(30);
    expect(GAME_HELP_MAP.daily_cover.content.length).toBeGreaterThan(30);
    expect(GAME_HELP_MAP.daily_riddle.content.length).toBeGreaterThan(30);
  });
});
