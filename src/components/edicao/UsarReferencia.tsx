// Aplica o estilo de uma referência analisada num vídeo do Estúdio e pede a edição ao editor IA.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Wand2 } from "lucide-react";
import { db } from "@/lib/vedit";
import { aplicarReferencia } from "@/lib/aplicarReferencia";
import type { Analise, Referencia } from "@/lib/referencias";

export function UsarReferencia({ r, a }: { r: Referencia; a: Analise }) {
  const navigate = useNavigate();
  const [projeto, setProjeto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const projetos = useQuery({
    queryKey: ["vedit", "projetos-curto"],
    queryFn: async () =>
      ((
        await db()
          .from("vedit_projetos")
          .select("id, nome")
          .not("fonte_path", "is", null)
          .order("updated_at", { ascending: false })
          .limit(30)
      ).data ?? []) as { id: string; nome: string }[],
  });

  async function usar() {
    setOcupado(true);
    try {
      const { pedido } = await aplicarReferencia(projeto, r, a);
      void pedido.catch((e) => toast.error(`Editor: ${(e as Error).message}`));
      toast.success(
        "Estilo aplicado. O editor está montando a edição; acompanhe no chat do vídeo.",
      );
      void navigate({ to: "/ads/edicao/$id", params: { id: projeto } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="text-sm font-semibold">Usar num vídeo</div>
      <p className="text-xs text-muted-foreground">
        Aplica legenda, look, transição e o ritmo desta referência, e pede ao editor para montar os
        efeitos no mesmo padrão — com o conteúdo do seu vídeo.
      </p>
      <div className="flex gap-2">
        <Select value={projeto} onValueChange={setProjeto}>
          <SelectTrigger className="h-9 flex-1">
            <SelectValue placeholder={projetos.isLoading ? "Carregando…" : "Escolha o vídeo"} />
          </SelectTrigger>
          <SelectContent>
            {(projetos.data ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-9" disabled={!projeto || ocupado} onClick={usar}>
          {ocupado ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4 mr-1.5" />
          )}
          Aplicar
        </Button>
      </div>
    </div>
  );
}
