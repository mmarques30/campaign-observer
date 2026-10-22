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
     - `VEDIT_MODELO` (padrão `claude-opus-5-5`)
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

## Comandos do chat

| Comando | O que faz |
|---|---|
| `/storyboard` | Plano cena a cena para aprovar antes de aplicar |
| `/editar` | Edição completa: cortes, legenda, efeitos, sons e CTA |
| `/cortar` | Remove silêncios, "é…", "tipo", "né" e frases repetidas |
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
