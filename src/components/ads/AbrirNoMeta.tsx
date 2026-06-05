import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

const ACT = "1796013081290329";

export function urlMetaCampaign(metaCampaignId: string) {
  return `https://www.facebook.com/ads/manager/manage/campaigns?act=${ACT}&selected_campaign_ids=${metaCampaignId}`;
}
export function urlMetaAdSet(metaAdsetId: string) {
  return `https://www.facebook.com/ads/manager/manage/adsets?act=${ACT}&selected_adset_ids=${metaAdsetId}`;
}
export function urlMetaAd(metaAdId: string) {
  return `https://www.facebook.com/ads/manager/manage/ads?act=${ACT}&selected_ad_ids=${metaAdId}`;
}

/** Botão "Abrir no Meta" — abre em nova aba. */
export function AbrirNoMetaButton({ url, label = "Abrir no Meta" }: { url: string; label?: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <a href={url} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="w-4 h-4 mr-1" />
        {label}
      </a>
    </Button>
  );
}

/** Variante só-ícone para linhas de tabela. */
export function AbrirNoMetaIcon({ url, title = "Abrir no Meta" }: { url: string; title?: string }) {
  return (
    <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
      <a href={url} target="_blank" rel="noopener noreferrer" title={title} aria-label={title}>
        <ExternalLink className="h-4 w-4" />
      </a>
    </Button>
  );
}
