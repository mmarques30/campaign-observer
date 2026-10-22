import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import type { Projeto } from "@/lib/vedit";

export function ConfirmarExclusao({
  projeto,
  ocupado,
  onCancelar,
  onConfirmar,
}: {
  projeto: Pick<Projeto, "id" | "nome"> | null;
  ocupado?: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <AlertDialog open={!!projeto} onOpenChange={(o) => !o && !ocupado && onCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir "{projeto?.nome}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Apaga o vídeo cru, a edição, as mídias e os renders deste projeto. Anúncios ou Reels já
            publicados na Meta continuam lá. Não dá para desfazer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={ocupado}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={ocupado}
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={(e) => {
              e.preventDefault();
              onConfirmar();
            }}
          >
            {ocupado && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
