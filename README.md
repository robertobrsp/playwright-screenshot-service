# playwright-screenshot-service + Virais do Momento

Este serviço Express faz duas coisas:

1. **`POST /screenshot`** é o serviço de screenshot com Playwright que já existia (sem mudanças).
2. **`GET /`** é o site **Virais do Momento**, que mostra o que está viralizando no **YouTube**, no **TikTok** e no **Instagram** nos últimos 15 dias.

## Rodando

```bash
npm install
npm start            # http://localhost:3000
```

Sem chaves configuradas, o site roda com **dados de demonstração** e mostra um aviso.

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `YOUTUBE_API_KEY` | Chave da [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) (gratuita, cota de 10.000 unidades por dia). |
| `APIFY_TOKEN` | Token do [Apify](https://console.apify.com/account/integrations), usado no TikTok e no Instagram. |
| `VIRAIS_DIAS` | Janela de tempo em dias (padrão `15`). |
| `VIRAIS_REGIAO` / `VIRAIS_IDIOMA` | Região e idioma do YouTube (padrão `BR` / `pt`). |
| `VIRAIS_CACHE_MINUTOS` | De quanto em quanto tempo os dados são renovados (padrão `60`). |
| `TIKTOK_HASHTAGS` / `INSTAGRAM_HASHTAGS` | Hashtags monitoradas, separadas por vírgula. |
| `TIKTOK_ACTOR` / `INSTAGRAM_ACTOR` | Actor do Apify (padrões: `clockworks/tiktok-scraper` e `apify/instagram-hashtag-scraper`). |
| `TIKTOK_ACTOR_INPUT` / `INSTAGRAM_ACTOR_INPUT` | JSON que substitui todo o input enviado ao actor. |

## Como funciona

- **YouTube**: junta a lista "Em alta" do país (`chart=mostPopular`) com uma busca dos vídeos mais vistos publicados nos últimos N dias. Cada atualização gasta cerca de 102 unidades de cota.
- **TikTok / Instagram**: não existe API oficial de "em alta". Por isso o serviço roda scrapers do Apify sobre hashtags populares e guarda só os posts dos últimos N dias. **Isso tem custo por uso no Apify**, e o cache existe para manter esse custo baixo.
- **Ranking "Mais viral"**: engajamento ponderado (views, curtidas, comentários e compartilhamentos) dividido pelas horas desde a publicação. Um vídeo que fez 1M de views em 1 dia fica acima de um que levou 14 dias para chegar lá.
- Os dados ficam em cache na memória e são renovados em segundo plano. Se uma fonte falhar, o site mostra a última versão boa e um aviso.

API: `GET /api/virais?plataforma=youtube,tiktok,instagram`
