import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";

/**
 * Botão que gera um PDF client-side sob demanda.
 * O módulo @react-pdf/renderer é carregado por import dinâmico dentro de `build`,
 * evitando que entre no bundle do SSR/inicial.
 */
export function PdfButton({ label = "Exportar PDF", build }: { label?: string; build: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true);
    try {
      await build();
    } catch (e) {
      toast.error(`Erro ao gerar PDF: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={go} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
      {loading ? "Gerando PDF..." : label}
    </Button>
  );
}
