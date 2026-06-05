import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { brl, num, pct } from "@/lib/ads-utils";

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: "Helvetica" },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  subtitle: { fontSize: 10, color: "#666", marginBottom: 18 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: "bold", marginBottom: 6, borderBottom: "1pt solid #ccc", paddingBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { fontSize: 10, color: "#666" },
  value: { fontSize: 10, fontWeight: "bold" },
  text: { fontSize: 10, color: "#333" },
  tableRow: { flexDirection: "row", borderBottom: "0.5pt solid #eee", paddingVertical: 3 },
  th: { fontSize: 9, fontWeight: "bold", flex: 1 },
  td: { fontSize: 9, flex: 1 },
  footer: { fontSize: 8, color: "#999", textAlign: "center", marginTop: 24 },
});

const FOOTER = "IAplicada Campaign Observer · Dados da Meta Marketing API · Sync a cada 4h";

type CampanhaRow = {
  campanha_nome?: string | null;
  status?: string | null;
  tipo_lead?: string | null;
  orcamento_diario_brl?: number | null;
  gasto_30d_brl?: number | null;
  lp_views_30d?: number | null;
  leads_meta_30d?: number | null;
  contacts_crm_30d?: number | null;
  cpl_meta_brl?: number | null;
  diagnostico?: string | null;
};
type AdRow = { ad_nome?: string | null; status?: string | null; gasto_brl?: number | null; ctr_pct?: number | null; cpl_brl?: number | null };

function RelatorioCampanhaPDF({ campanha, ads }: { campanha: CampanhaRow; ads: AdRow[] }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Relatório: {campanha.campanha_nome ?? "—"}</Text>
        <Text style={styles.subtitle}>Gerado em {new Date().toLocaleDateString("pt-BR")} · Período: últimos 30 dias</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo</Text>
          <Linha label="Status" value={campanha.status ?? "—"} />
          <Linha label="Tipo" value={campanha.tipo_lead ?? "—"} />
          <Linha label="Orçamento diário" value={brl(campanha.orcamento_diario_brl)} />
          <Linha label="Gasto 30d" value={brl(campanha.gasto_30d_brl)} />
          <Linha label="LP views 30d" value={num(campanha.lp_views_30d)} />
          <Linha label="Leads Meta" value={num(campanha.leads_meta_30d)} />
          <Linha label="Leads CRM" value={num(campanha.contacts_crm_30d)} />
          <Linha label="CPL Meta" value={campanha.cpl_meta_brl != null ? brl(campanha.cpl_meta_brl) : "—"} />
        </View>

        {campanha.diagnostico && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diagnóstico</Text>
            <Text style={styles.text}>{campanha.diagnostico}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Anúncios ({ads.length})</Text>
          <View style={styles.tableRow}>
            <Text style={styles.th}>Nome</Text>
            <Text style={styles.th}>Status</Text>
            <Text style={styles.th}>Gasto</Text>
            <Text style={styles.th}>CTR%</Text>
            <Text style={styles.th}>CPL</Text>
          </View>
          {ads.map((ad, i) => (
            <View style={styles.tableRow} key={i} wrap={false}>
              <Text style={styles.td}>{ad.ad_nome ?? "—"}</Text>
              <Text style={styles.td}>{ad.status ?? "—"}</Text>
              <Text style={styles.td}>{brl(ad.gasto_brl)}</Text>
              <Text style={styles.td}>{pct(ad.ctr_pct)}</Text>
              <Text style={styles.td}>{ad.cpl_brl != null ? brl(ad.cpl_brl) : "—"}</Text>
            </View>
          ))}
          {ads.length === 0 && <Text style={styles.text}>Sem anúncios com dados.</Text>}
        </View>

        <Text style={styles.footer}>{FOOTER}</Text>
      </Page>
    </Document>
  );
}

type Resumo = { gasto: number; leadsMeta: number; contactsCrm: number; conv: number; campanhasAtivas: number };

function RelatorioGeralPDF({ resumo, campanhas, topAds }: { resumo: Resumo; campanhas: CampanhaRow[]; topAds: AdRow[] }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Relatório geral — Meta Ads</Text>
        <Text style={styles.subtitle}>Gerado em {new Date().toLocaleDateString("pt-BR")} · Período: últimos 30 dias</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo geral</Text>
          <Linha label="Campanhas ativas" value={num(resumo.campanhasAtivas)} />
          <Linha label="Gasto 30d" value={brl(resumo.gasto)} />
          <Linha label="Leads Meta 30d" value={num(resumo.leadsMeta)} />
          <Linha label="Contatos CRM 30d" value={num(resumo.contactsCrm)} />
          <Linha label="Conversão média" value={pct(resumo.conv)} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campanhas ({campanhas.length})</Text>
          <View style={styles.tableRow}>
            <Text style={styles.th}>Nome</Text>
            <Text style={styles.th}>Status</Text>
            <Text style={styles.th}>Gasto</Text>
            <Text style={styles.th}>Leads</Text>
            <Text style={styles.th}>CRM</Text>
            <Text style={styles.th}>CPL</Text>
          </View>
          {campanhas.map((c, i) => (
            <View style={styles.tableRow} key={i} wrap={false}>
              <Text style={styles.td}>{c.campanha_nome ?? "—"}</Text>
              <Text style={styles.td}>{c.status ?? "—"}</Text>
              <Text style={styles.td}>{brl(c.gasto_30d_brl)}</Text>
              <Text style={styles.td}>{num(c.leads_meta_30d)}</Text>
              <Text style={styles.td}>{num(c.contacts_crm_30d)}</Text>
              <Text style={styles.td}>{c.cpl_meta_brl != null ? brl(c.cpl_meta_brl) : "—"}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top anúncios</Text>
          <View style={styles.tableRow}>
            <Text style={styles.th}>Nome</Text>
            <Text style={styles.th}>Gasto</Text>
            <Text style={styles.th}>CTR%</Text>
            <Text style={styles.th}>CPL</Text>
          </View>
          {topAds.map((ad, i) => (
            <View style={styles.tableRow} key={i} wrap={false}>
              <Text style={styles.td}>{ad.ad_nome ?? "—"}</Text>
              <Text style={styles.td}>{brl(ad.gasto_brl)}</Text>
              <Text style={styles.td}>{pct(ad.ctr_pct)}</Text>
              <Text style={styles.td}>{ad.cpl_brl != null ? brl(ad.cpl_brl) : "—"}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>{FOOTER}</Text>
      </Page>
    </Document>
  );
}

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

async function baixar(doc: React.ReactElement, fileName: string) {
  const blob = await pdf(doc as any).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function slugFile(s: string) {
  return (s ?? "relatorio").replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 60) || "relatorio";
}

export async function baixarRelatorioCampanha(campanha: CampanhaRow, ads: AdRow[]) {
  const data = new Date().toISOString().slice(0, 10);
  await baixar(<RelatorioCampanhaPDF campanha={campanha} ads={ads} />, `relatorio-${slugFile(campanha.campanha_nome ?? "")}-${data}.pdf`);
}

export async function baixarRelatorioGeral(resumo: Resumo, campanhas: CampanhaRow[], topAds: AdRow[]) {
  const data = new Date().toISOString().slice(0, 10);
  await baixar(<RelatorioGeralPDF resumo={resumo} campanhas={campanhas} topAds={topAds} />, `relatorio-geral-${data}.pdf`);
}
