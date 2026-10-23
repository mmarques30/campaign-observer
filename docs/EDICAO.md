# Módulo Edição — editor de vídeo com IA (IAplicada Ads)

Menu **Edição** (logo abaixo de **Análise & Saúde**): **Estúdio** (vídeos), **Efeitos** (biblioteca com preview) e **Marca**.

## Como funciona

```
vídeo cru ──► Supabase Storage (video-edicao)
   │            └─ áudio extraído no navegador (WAV 16 kHz) ──► vedit-transcrever (OpenAI whisper-1, tempo por palavra)
   ▼
pedido em português ou /comando ──► vedit-agente (Claude Opus, tool "aplicar_edicao")
   │                                   └─ devolve a TIMELINE (JSON), nunca código
   ▼
preview ao vivo no navegador (Remotion Player, src/video)  ◄── mesma composição ──►  render-worker (Remotion, MP4 1080p)
                                                                                          │
publicar ◄──────────────────────────────────────────────────────────────────────────────┘
  ├─ Anúncio: vedit-publicar (copia p/ mads-creatives) → meta-add-entity (PAUSADO, com UTM)
  ├─ Reel / Trial Reel: vedit-publicar (Graph API REELS)
  └─ Baixar MP4
```

- `src/video/` é o motor. **Nada aqui importa do app** (só `remotion` e `zod`), para o worker conseguir empacotar.
  - `schema.ts`: contrato da timeline. Todos os tempos estão em segundos do vídeo **original**.
  - `tempo.ts`: converte o tempo original para o tempo final, depois dos cortes.
  - `Reel.tsx`: a composição (cortes, zoom, look, legenda, efeitos, sons, música com ducking).
  - `catalogo.ts`: a biblioteca de efeitos e comandos. É dela que sai o manual que o Claude recebe.
  - `efeitos/*.tsx`: um componente por efeito.
- Fontes e efeitos sonoros ficam embutidos em `public/vedit/`. O render não depende do Google Fonts.

## Implantação (uma vez)

1. **Banco**: rode `supabase/migrations/20261022210000_vedit_editor_video.sql`. Ela cria:
   - as tabelas `vedit_*`;
   - o bucket privado `video-edicao`;
   - a RPC `vedit_pegar_render`;
   - a marca IAplicada padrão.
2. **Funções** (`supabase/functions/`): `vedit-transcrever`, `vedit-agente`, `vedit-publicar`.
   - Os secrets já existentes que elas usam:
     - `OPENAI_API_KEY`
     - `CLAUDE_API_KEY` (ou `ANTHROPIC_API_KEY`)
     - `META_ADS_TOKEN`, lido via `rpc get_secret`
   - Secrets opcionais:
     - `PEXELS_API_KEY` e `UNSPLASH_ACCESS_KEY` (busca de imagens/vídeos da internet pelo chat)
     - `VEDIT_MODELO` (padrão `claude-opus-5`)
     - `IG_USER_ID` (conta do Instagram para publicar Reels)
3. **Worker de render**: é um container Node 22 que fica lendo a fila `vedit_renders`.
   ```bash
   docker build -f render-worker/Dockerfile -t vedit-worker .
   # variáveis: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (opcional: CONCORRENCIA, WORKER_NOME)
   ```
   - Railway, Fly ou Render servem. Com 2 vCPU / 4 GB, um Reel de 30s leva 1–2 min.
   - Sem o worker ligado, o preview e a edição funcionam normalmente; só o botão Renderizar fica na fila.
4. **Licença Remotion**:
   - Grátis para empresas com até 3 pessoas.
   - Acima disso: Company License, US$ 25 por dev/mês + US$ 0,01 por render, mínimo de US$ 100/mês.
   - Alternativa sem licença: HyperFrames (HeyGen, Apache 2.0). Exigiria reescrever `src/video`.

## Envio do vídeo

- O envio é resumível (TUS, pedaços de 6 MB) e roda na aba que o começou. Se a aba fechar, o editor mostra **Continuar envio**: escolhendo o mesmo arquivo, ele retoma de onde parou, sem transcrever de novo.
- O limite global de upload do projeto Supabase (Project Settings → Storage) precisa ser maior que o maior vídeo (padrão 50 MB; o bucket aceita até 1 GB).
- Vídeo acima de 1080p é **reduzido para 1080p no navegador** antes de subir (WebCodecs via `mediabunny`, H.264 10 Mbps + AAC): um 4K de 100 s (~700 MB) vira ~130 MB. Se o navegador não decodificar o arquivo (sem WebCodecs, HEVC sem hardware), o original sobe e o worker gera o proxy 1080p.

## Repetições (tomadas)

`src/video/repeticoes.ts` (cópia em `supabase/functions/vedit-agente/`) detecta falas repetidas sem IA: quebra a transcrição em frases por pausa, compara cada frase com as 3 seguintes (Jaccard sem stopwords + prefixo para tomadas abortadas) e marca a anterior para sair, mantendo a última. O editor mostra o painel "falas repetidas", o corte rápido já as remove e o agente recebe a lista pronta.

## Música (Edição → Trilhas)

- 4 trilhas de base vêm com o editor (`public/vedit/trilhas/`, sintetizadas por `scripts/trilhas-sintese.py`, sem direitos de terceiros): Pulso (anúncio viral), Corporativo leve (editorial/limpo), Tensão (abrir com dor), Lo-fi (orgânico).
- A biblioteca da marca fica no bucket (`video-edicao/trilhas/` + `trilhas/biblioteca.json`, sem tabela). No upload a faixa é medida e ganha um `ganho` para tocar no mesmo volume percebido das outras.
- `timeline.musica`: `midia` ("trilha:<id>" ou áudio do projeto), `volume` (0.16 anúncio / 0.12 orgânico), `abaixarPara` (ducking suave quando há fala, padrão 0.3 ≈ −10 dB), `ganho`, `inicio`, `fade`.
- Ao aceitar a sugestão, a v1 já vem com trilha (pelo objetivo e estilo). No chat: `/musica`, `/musica mais alta|mais baixa|outra|sem`.

## Imagens sugeridas (aba Mídias)

`vedit-imagens`: o Claude lê só a fala que ficou nos cortes, escolhe 4–8 momentos e uma busca para cada um; as candidatas vêm do Pexels/Unsplash (se houver chave) ou do Openverse (licenças com uso comercial, sem chave). Você escolhe a imagem e o modo de entrada (janela, tela cheia, dividida, atrás de você — com recorte, ou em moldura sem recorte —, react, celular); o efeito entra no tempo certo com som de swipe. A imagem escolhida é baixada para `vedit_midias` com o crédito na descrição.

## Fase 2 — recorte da pessoa

Botão **Recortar pessoa** no editor: MediaPipe selfie segmenter no navegador, quadro a quadro, gravado como WebM VP9 com alfa (720p) em `video-edicao/<projeto>/recorte-pessoa.webm` (registrado em `vedit_midias`). Libera `/atras`, `/trocarfundo`, `/contorno`, `/moldura`, `/vertigo`, que seguem os cortes e o zoom do vídeo base. O worker usa o mesmo arquivo no render.

## Pesquisa de nicho (Edição → Pesquisa)

O que o Igão mostra no reel: achar os Reels que mais viralizaram no nicho, explicar por que funcionaram e virar roteiro original. Tudo pela **API oficial do Instagram** (Graph API) com o `META_ADS_TOKEN` que já publica os Reels (`instagram_basic` + `instagram_manage_insights`):
- **Perfis**: `business_discovery.username(x){followers_count, media{like_count, comments_count, …}}` para qualquer conta business/creator. "Sugerir perfis" pede ao Claude usernames do nicho e só cadastra os que a API valida.
- **Hashtags**: `ig_hashtag_search` + `/top_media` (Meta limita a 30 hashtags distintas por 7 dias).
- **Índice viral** = (curtidas + comentários) ÷ mediana dos reels do próprio perfil — "quantas vezes acima do normal". A API não expõe plays de terceiros; curtidas+comentários é o que existe oficialmente.
- **Analisar** (`vedit-pesquisa` → Claude): por que funcionou (gancho, mecanismo, estrutura, CTA, o que é transferível) + roteiro original na voz da Mariana (gancho, falas, CTA, legenda, palavra-chave, formato, efeitos sugeridos do editor).
- **Enviar para o Marketing**: cria o roteiro em `content_items` (status backlog, link de referência, recomendações de edição). De lá o Estúdio já lê o roteiro na sugestão.
Tabelas: `vedit_nicho_config`, `vedit_nicho_perfis`, `vedit_nicho_reels` (migração `20261023010000_vedit_pesquisa_nicho.sql`).

## Referências (Edição → Referências)

Biblioteca de Reels de referência. Pipeline: link + arquivo do vídeo → no navegador: áudio (WAV) e folhas de quadros (12 quadros por imagem, 1 a cada ~1,2 s, tempo carimbado) → `vedit-referencia`:
- `transcrever`: Whisper palavra a palavra;
- `analisar`: Claude (visão) lê as folhas + fala + `catalogoParaClaude()` e devolve gancho, estilo, ritmo, técnicas com tempo e receita, mapeamento **temos / adaptar / criar**, aprendizados, preset de estilo e um pedido pronto para o editor.
- `metadados`: oEmbed (YouTube/TikTok; Instagram só com app com "oEmbed Read").
O Instagram não permite baixar o vídeo pelo servidor sem login — por isso o arquivo é solto na tela. Tabela `vedit_referencias` (migração `20261023000000_vedit_referencias.sql`); arquivos em `video-edicao/referencias/<id>/`. A seção "Para criar ou adaptar" agrega as técnicas que ainda não temos → backlog de efeitos.

## Comandos do chat

| Comando | O que faz |
|---|---|
| `/storyboard` | Plano cena a cena para aprovar antes de aplicar |
| `/editar` | Edição completa: cortes, legenda, efeitos, sons e CTA |
| `/cortar` | Remove silêncios, "é…", "tipo", "né" e tomadas repetidas (fica a última) |
| `/legenda` | Estilos karaoke, caixa, editorial, neon, maquina, impacto |
| `/gancho` | 3 opções de gancho para os 3 primeiros segundos |
| `/zoom` | Socos de zoom nas palavras de ênfase |
| `/sons` | Efeitos sonoros sincronizados |
| `/anuncio` | Ajusta a edição às regras de anúncio |
| `/organico` | Ajusta a edição às regras de Reel orgânico |
| `/variacoes N` | N versões com ganchos diferentes (viram projetos irmãos, prontos para Trial Reels) |
| `/formato` | Muda o formato |
| `/look` | Muda o look |
| `/desfazer` | Volta uma versão |

| `/imagem` | Busca foto ou vídeo gratuito (Pexels/Unsplash) e encaixa na edição. Precisa de `PEXELS_API_KEY` (opcional `UNSPLASH_ACCESS_KEY`) nos secrets do Supabase |
| `/estilo` | Troca o estilo visual: viral, editorial ou limpo |

Os efeitos também são comandos: `/titulo /gigante /capa /trava /letreiro /recorte /postit /checklist /celular /vidro /grafico /contador /comentario /notificacao /orbita /broll /colagem /antesdepois /particulas /rabisco /cta`.

## Fase 2

**Recorte da pessoa** no worker (BiRefNet ou SAM 2 via fal/Replicate), gerando o vídeo com fundo transparente. Isso libera:
- texto atrás da pessoa;
- moldura quebrada;
- troca de fundo;
- vertigo;
- contorno rabiscado.

**Outras frentes:**
- `/cena`: cena gerada por IA (Veo/Kling/Seedance via fal).
- Voz limpa (ElevenLabs Voice Isolator).
- Reenquadramento seguindo o rosto.
- Vídeo → carrossel.
- Edição arrastando os blocos direto nas trilhas.

## Testar efeitos sem o app

```bash
cd render-worker && npm install
npx tsx teste-efeitos.ts <url-de-um-mp4> <palavras.json> /tmp/saida [vidro,trava,...]
```
