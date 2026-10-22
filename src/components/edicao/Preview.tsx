import { forwardRef, useEffect, useMemo, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { Reel, calcularDuracao } from "@/video/Reel";
import { FORMATOS, type ReelProps } from "@/video/schema";

/** Preview ao vivo da edição (mesma composição do render final). Só roda no navegador. */
export const Preview = forwardRef<
  PlayerRef,
  {
    props: ReelProps;
    zonasSeguras?: boolean;
    controles?: boolean;
    loop?: boolean;
    autoPlay?: boolean;
    className?: string;
    maxAltura?: string;
  }
>(function Preview(
  {
    props,
    zonasSeguras,
    controles = true,
    loop = false,
    autoPlay = false,
    className,
    maxAltura = "72vh",
  },
  ref,
) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const dim = FORMATOS[props.timeline.formato] ?? FORMATOS["9:16"];
  const duracao = useMemo(() => calcularDuracao(props, 30), [props]);
  const proporcao = `${dim.width} / ${dim.height}`;
  if (!montado)
    return (
      <div
        className={className}
        style={{
          aspectRatio: proporcao,
          maxHeight: maxAltura,
          background: "#111",
          borderRadius: 16,
        }}
      />
    );
  return (
    <div
      className={className}
      style={{
        position: "relative",
        aspectRatio: proporcao,
        maxHeight: maxAltura,
        borderRadius: 16,
        overflow: "hidden",
        background: "#000",
      }}
    >
      <Player
        ref={ref}
        component={Reel as any}
        inputProps={props as any}
        durationInFrames={duracao}
        fps={30}
        compositionWidth={dim.width}
        compositionHeight={dim.height}
        style={{ width: "100%", height: "100%" }}
        controls={controles}
        loop={loop}
        autoPlay={autoPlay}
        acknowledgeRemotionLicense
        clickToPlay
        spaceKeyToPlayOrPause
      />
      {zonasSeguras && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {/* Zonas seguras Meta Reels 2026: 14% topo, 35% base, 6% laterais */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: "14%",
              background:
                "repeating-linear-gradient(45deg, rgba(255,60,60,.28) 0 8px, rgba(255,60,60,.12) 8px 16px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: "35%",
              background:
                "repeating-linear-gradient(45deg, rgba(255,60,60,.28) 0 8px, rgba(255,60,60,.12) 8px 16px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: "14%",
              bottom: "35%",
              width: "6%",
              background: "rgba(255,60,60,.18)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "14%",
              bottom: "35%",
              width: "6%",
              background: "rgba(255,60,60,.18)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "36%",
              left: 8,
              fontSize: 10,
              color: "#fff",
              background: "rgba(0,0,0,.6)",
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            zona coberta pela interface do Instagram
          </div>
        </div>
      )}
    </div>
  );
});
