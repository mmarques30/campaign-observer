// Entrada do render no servidor (worker). O front usa o Reel direto no Player.
import { Composition, registerRoot } from "remotion";
import { calcularDuracao, Reel } from "./Reel";
import { FORMATOS, normalizarTimeline, timelineVazia, type ReelProps } from "./schema";

const padrao: ReelProps = {
  timeline: timelineVazia(),
  palavras: [],
  fonteUrl: "",
  duracaoFonte: 5,
  midias: {},
};

function Raiz() {
  return (
    <Composition
      id="Reel"
      component={Reel as any}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={150}
      defaultProps={padrao as any}
      calculateMetadata={({ props }) => {
        const p = props as unknown as ReelProps;
        const dim = FORMATOS[normalizarTimeline(p.timeline).timeline.formato] ?? FORMATOS["9:16"];
        return {
          durationInFrames: calcularDuracao(p, 30),
          width: dim.width,
          height: dim.height,
          fps: 30,
        };
      }}
    />
  );
}

registerRoot(Raiz);
