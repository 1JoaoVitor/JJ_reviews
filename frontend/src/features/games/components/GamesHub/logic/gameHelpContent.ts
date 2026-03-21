export type GameId = "menu" | "battle" | "daily_cover" | "daily_riddle";

export interface GameHelp {
   title: string;
   content: string;
}

export const GAME_HELP_MAP: Record<Exclude<GameId, "menu">, GameHelp> = {
   battle: {
      title: "Como jogar: Modo Batalha",
      content:
         "Crie um torneio mata-mata com seus filmes.\n\n" +
         "Escolha a fonte:\n" +
         "• Meus assistidos: Filmes que você já viu e avaliou\n" +
         "• Lista selecionada: Filmes de uma lista específica\n" +
         "• Rodada diária de 16: Filmes aleatórios do dia\n\n" +
         "Gameplay:\n" +
         "• A cada duelo, selecione seu favorito\n" +
         "• O vencedor segue para a próxima rodada\n" +
         "• Continue até restar 1 filme campeão\n\n" +
         "obs: Se não tiver filmes suficientes para rodadas completas, o sistema adicionará byes (folgas).",
   },
   daily_cover: {
      title: "Como jogar: Filme do Dia (Capa)",
      content:
         "Adivinhe o filme pela capa, revelada progressivamente.\n\n" +
         "Objetivo:\n" +
         "• Adivinhar qual filme é a capa com base nas pistas visuais\n" +
         "• Começa com a capa totalmente desfocada\n" +
         "• Conforme erra, mais da capa é revelada\n\n" +
         "Fontes disponíveis:\n" +
         "• Diário: Mesmo filme diário para todos os jogadores.\n" +
         "• Meus assistidos: Apenas seus filmes assistidos\n" +
         "• Lista: Filmes de uma lista específica\n\n" +
         "Dicas:\n" +
         "• Disponível quando você tiver ≤3 vidas\n" +
         "• Revela 1 atributo (diretor, ano, gênero, etc) que ainda não acertou",
   },
   daily_riddle: {
      title: "Como jogar: Filme do Dia (Enigma)",
      content:
         "Adivinhe o filme com base em atributos.\n\n" +
         "Objetivo:\n" +
         "• Chutar títulos de filmes\n" +
         "• Receber feedback colorido sobre cada atributo comparado\n" +
         "• 6 vidas para acertar\n\n" +
         "Feedback dos atributos:\n" +
         "• ✅ Verde: Acertou\n" +
         "• 🟡 Amarelo: Está próximo, acertou uma parte. Se for ano está no intervalo ±5 anos.\n" +
         "• 🔴 Vermelho: Errado\n\n" +
         "Dicas:\n" +
         "• Disponível quando você tiver ≤3 vidas\n" +
         "• Revela 1 atributo que ainda não acertou",
   },
};
