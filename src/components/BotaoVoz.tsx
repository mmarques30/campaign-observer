// Botão de microfone: grava a fala, transcreve (Whisper) e devolve o texto para o campo do chat.
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Square } from "lucide-react";
import { callEdgeFunction } from "@/lib/ads-mutations";
import { cn } from "@/lib/utils";

function paraBase64(b: Blob) {
  return new Promise<string>((ok, erro) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] ?? "");
    r.onerror = () => erro(new Error("não consegui ler o áudio"));
    r.readAsDataURL(b);
  });
}

export function BotaoVoz({
  onTexto,
  disabled,
  className,
}: {
  onTexto: (texto: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [estado, setEstado] = useState<"parado" | "gravando" | "transcrevendo">("parado");
  const [segundos, setSegundos] = useState(0);
  const gravador = useRef<MediaRecorder | null>(null);
  const partes = useRef<Blob[]>([]);
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (relogio.current) clearInterval(relogio.current);
      gravador.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  async function iniciar() {
    if (!navigator.mediaDevices?.getUserMedia)
      return toast.error("Este navegador não permite gravar áudio.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const mr = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      partes.current = [];
      mr.ondataavailable = (e) => e.data.size && partes.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (relogio.current) clearInterval(relogio.current);
        const blob = new Blob(partes.current, { type: mr.mimeType || "audio/webm" });
        if (blob.size < 2000) return setEstado("parado");
        setEstado("transcrevendo");
        try {
          const r = await callEdgeFunction<{ texto?: string; error?: string }>("transcrever-voz", {
            audio: await paraBase64(blob),
            tipo: blob.type,
          });
          if (r?.error) throw new Error(r.error);
          // O Whisper "inventa" estas frases quando o áudio é só silêncio ou ruído.
          const texto = (r?.texto ?? "")
            .replace(/legendas pela comunidade amara\.org|obrigad[oa] por assistir\.?/gi, "")
            .trim();
          if (texto) onTexto(texto);
          else toast.info("Não entendi o áudio. Tente de novo mais perto do microfone.");
        } catch (e) {
          toast.error(`Áudio: ${(e as Error).message}`);
        } finally {
          setEstado("parado");
        }
      };
      mr.start();
      gravador.current = mr;
      setSegundos(0);
      relogio.current = setInterval(() => setSegundos((s) => s + 1), 1000);
      setEstado("gravando");
    } catch {
      toast.error("Libere o microfone para este site (ícone de cadeado na barra de endereço).");
    }
  }

  const parar = () => gravador.current?.state === "recording" && gravador.current.stop();

  return (
    <Button
      type="button"
      size="icon"
      variant={estado === "gravando" ? "destructive" : "outline"}
      className={cn("shrink-0", estado === "gravando" && "w-auto px-2.5 gap-1.5", className)}
      disabled={disabled || estado === "transcrevendo"}
      title={estado === "gravando" ? "Parar e transcrever" : "Falar em vez de digitar"}
      onClick={estado === "gravando" ? parar : iniciar}
    >
      {estado === "transcrevendo" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : estado === "gravando" ? (
        <>
          <Square className="h-3.5 w-3.5 fill-current" />
          <span className="text-xs tabular-nums">
            {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, "0")}
          </span>
        </>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
