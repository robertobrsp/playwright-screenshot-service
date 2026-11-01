import { normalize, WINDOW_DAYS } from "../util.js";

const TITLES = {
  youtube: [
    "Reagindo ao desafio mais difícil da internet",
    "Fiz 24h no mercado e olha no que deu",
    "O clipe que todo mundo está comentando",
    "Testei a receita viral de 3 ingredientes",
    "Melhores momentos do jogo de ontem",
    "Explicando a nova trend em 5 minutos",
  ],
  tiktok: [
    "A dancinha que tomou conta do FYP 💃",
    "POV: você chega atrasado na reunião",
    "Esse áudio não sai da minha cabeça",
    "Truque de cozinha que ninguém te contou",
    "Meu cachorro aprendeu a trend 🐶",
    "Transformação de look em 10 segundos",
  ],
  instagram: [
    "Reels: o pôr do sol mais bonito do ano",
    "Antes e depois que ninguém acreditou",
    "Esse meme resume a segunda-feira",
    "Receita fácil para o fim de semana",
    "Viagem de 3 dias gastando pouco",
    "Bastidores da gravação 🎬",
  ],
};

const SUMMARIES = {
  youtube: [
    "Criadores tentam completar um desafio que está circulando nas redes e mostram as reações a cada tentativa que dá errado.",
    "Passa um dia inteiro dentro de um mercado, mostrando o que acontece de madrugada e quanto gastou no final.",
    "Clipe novo de uma artista brasileira, com coreografia e cenário que viraram assunto nos comentários.",
    "Testa na prática a receita de 3 ingredientes que viralizou e conta se o resultado fica igual ao das redes.",
    "Compilado dos lances mais importantes da partida, com os gols, a polêmica do VAR e a comemoração no fim.",
    "Explica de onde veio a trend do momento, por que ela pegou e como fazer a sua versão.",
  ],
};

const AUTHORS = ["@canaldoze", "@trendsbr", "@viralizou", "@cozinhafacil", "@memesdodia", "@rotinareal"];

// Gerador determinístico para os dados não mudarem a cada refresh
function rand(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export function mockItems(platform) {
  const r = rand(platform.length * 7919);
  return TITLES[platform].map((title, i) => {
    const ageHours = 6 + r() * (WINDOW_DAYS * 24 - 12);
    const views = Math.round(2e5 + r() * 2e7);
    return normalize({
      platform,
      id: `demo-${platform}-${i}`,
      title,
      summary: SUMMARIES[platform]?.[i] || "",
      author: AUTHORS[i % AUTHORS.length],
      url: { youtube: "https://www.youtube.com", tiktok: "https://www.tiktok.com", instagram: "https://www.instagram.com" }[platform],
      thumbnail: `https://picsum.photos/seed/${platform}${i}/480/${platform === "youtube" ? 270 : 600}`,
      publishedAt: Date.now() - ageHours * 36e5,
      views,
      likes: Math.round(views * (0.03 + r() * 0.08)),
      comments: Math.round(views * (0.001 + r() * 0.004)),
      shares: platform === "tiktok" ? Math.round(views * r() * 0.01) : 0,
    });
  });
}
