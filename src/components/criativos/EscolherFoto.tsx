// Seletor de foto da biblioteca (com envio rápido), usado no editor de slides.
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ImagePlus, Loader2, Upload, X } from "lucide-react";
import { enviarFoto, useFotos } from "@/lib/criativos";
import { cn } from "@/lib/utils";

export function EscolherFoto({
  valor,
  onEscolher,
  rotulo,
}: {
  valor?: string | null;
  onEscolher: (id: string | null) => void;
  rotulo: string;
}) {
  const qc = useQueryClient();
  const fotos = useFotos();
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const atual = valor ? fotos.data?.porId.get(valor) : undefined;
  const lista = (fotos.data?.lista ?? []).filter((f) => f.origem !== "referencia");

  return (
    <div className="flex items-center gap-2">
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-16 w-[52px] rounded-md border overflow-hidden bg-muted flex items-center justify-center shrink-0 hover:border-primary"
            title={rotulo}
          >
            {atual ? (
              <img src={atual.url} className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-2" align="start">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-xs font-medium">{rotulo}</span>
            <input
              ref={input}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setEnviando(true);
                try {
                  const nova = await enviarFoto(f);
                  await qc.invalidateQueries({ queryKey: ["cria", "fotos"] });
                  onEscolher(nova.id);
                  setAberto(false);
                } catch (err) {
                  toast.error((err as Error).message);
                } finally {
                  setEnviando(false);
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              onClick={() => input.current?.click()}
            >
              {enviando ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5 mr-1" />
              )}
              Subir
            </Button>
          </div>
          <div className="grid grid-cols-5 gap-1.5 max-h-72 overflow-y-auto">
            {lista.map((f) => (
              <button
                key={f.id}
                type="button"
                title={f.descricao ?? f.nome ?? ""}
                onClick={() => {
                  onEscolher(f.id);
                  setAberto(false);
                }}
                className={cn(
                  "aspect-[4/5] rounded overflow-hidden border",
                  f.id === valor && "ring-2 ring-primary",
                )}
              >
                <img src={f.url} className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {valor && (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          title="Tirar foto"
          onClick={() => onEscolher(null)}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
