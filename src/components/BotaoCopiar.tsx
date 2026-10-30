// Botão pequeno de copiar texto (mensagens do chat, legendas…). Aparece no hover do grupo.
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function BotaoCopiar({ texto, className }: { texto: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      title="Copiar"
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-md opacity-60 hover:opacity-100 hover:bg-black/10",
        className,
      )}
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(texto);
        } catch {
          // Navegadores sem acesso à área de transferência: cópia pelo método antigo.
          const t = document.createElement("textarea");
          t.value = texto;
          t.style.position = "fixed";
          t.style.opacity = "0";
          document.body.appendChild(t);
          t.select();
          document.execCommand("copy");
          t.remove();
        }
        setOk(true);
        toast.success("Copiado.");
        setTimeout(() => setOk(false), 1500);
      }}
    >
      {ok ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
