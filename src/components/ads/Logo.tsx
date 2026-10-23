import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Proporção do PNG oficial (2108x500). */
const RATIO = 2108 / 500;

/**
 * Logo oficial IAplicada (símbolo + wordmark). Troca automaticamente entre a
 * versão para fundo escuro e para fundo claro conforme o tema ativo.
 */
export function Logo({ size = 22, className }: { size?: number; className?: string }) {
  const { resolved } = useTheme();
  const src = resolved === "dark" ? "/brand/iaplicada-logo-dark.png" : "/brand/iaplicada-logo-light.png";
  return (
    <img
      src={src}
      alt="IAplicada"
      width={Math.round(size * RATIO)}
      height={size}
      decoding="async"
      className={cn("block w-auto select-none", className)}
      style={{ height: size }}
    />
  );
}

/** Só o símbolo (quatro folhas) — para o modo recolhido e favicons. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/iaplicada-mark.png"
      alt="IAplicada"
      width={size}
      height={size}
      decoding="async"
      className={cn("block select-none", className)}
      style={{ width: size, height: size }}
    />
  );
}
