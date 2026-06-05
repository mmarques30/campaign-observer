import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Target, Plus, Loader2, Info, BarChart3 } from "lucide-react";
import { num } from "@/lib/ads-utils";
import { callEdgeFunction } from "@/lib/ads-mutations";

export const Route = createFileRoute("/_authenticated/ads/audiencias")({
  component: Audiencias,
});

type Audience = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string | null;
  meta_audience_id: string | null;
  total_usuarios: number | null;
  source_audience_id: string | null;
  pais: string | null;
  ratio: number | null;
  status: string | null;
  status_meta: string | null;
  created_at: string | null;
};

const TIPO_LEAD = ["business", "contabil", "academy", "skills", "advocacia"];
const FAIXAS = ["Menos de R$ 1 milhão", "Entre 1MM e 5MM", "Entre 5MM e 10MM", "Entre 10MM e 50MM", "Acima de 50MM"];
const RATIOS = [
  { v: "0.01", l: "1% (mais similar, ~2M no Brasil)" },
  { v: "0.03", l: "3% (~6M)" },
  { v: "0.05", l: "5% (~10M)" },
  { v: "0.10", l: "10% (~20M)" },
];

function statusBadge(s: string | null) {
  const v = (s ?? "").toLowerCase();
  if (v === "pronta" || v === "ready") return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
  if (v.includes("process") || v === "gerando") return "bg-blue-500/15 text-blue-600 border-blue-500/30";
  if (v.includes("erro") || v === "error") return "bg-red-500/15 text-red-600 border-red-500/30";
  return "bg-zinc-500/15 text-zinc-500 border-zinc-500/30";
}

function Audiencias() {
  const qc = useQueryClient();
  const [customOpen, setCustomOpen] = useState(false);
  const [lookalikeOpen, setLookalikeOpen] = useState(false);
  const [lookalikeSeed, setLookalikeSeed] = useState<string>("");

  const audiences = useQuery({
    queryKey: ["mads", "audiences"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("mads_audiences")
        .select("id, nome, descricao, tipo, meta_audience_id, total_usuarios, source_audience_id, pais, ratio, status, status_meta, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Audience[];
    },
  });

  const all = audiences.data ?? [];
  const customs = all.filter((a) => (a.tipo ?? "").toLowerCase() === "custom");
  const lookalikes = all.filter((a) => (a.tipo ?? "").toLowerCase() === "lookalike");
  const nomePorId = new Map(all.map((a) => [a.id, a.nome]));

  function abrirLookalikeCom(seedId: string) {
    setLookalikeSeed(seedId);
    setLookalikeOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Audiências</h1>
          <p className="text-sm text-muted-foreground">Públicos personalizados criados do CRM e Lookalikes derivadas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCustomOpen(true)}><Plus className="h-4 w-4 mr-2" /> Custom do CRM</Button>
          <Button onClick={() => { setLookalikeSeed(""); setLookalikeOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Lookalike</Button>
        </div>
      </div>

      <Tabs defaultValue="custom">
        <TabsList>
          <TabsTrigger value="custom">📋 Custom Audiences</TabsTrigger>
          <TabsTrigger value="lookalike">🎯 Lookalike Audiences</TabsTrigger>
        </TabsList>

        <TabsContent value="custom">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nome</TableHead><TableHead className="text-right">Usuários</TableHead>
                  <TableHead>Status</TableHead><TableHead>Criada em</TableHead><TableHead className="text-right">Ações</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {audiences.isLoading && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>}
                  {!audiences.isLoading && customs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Nenhuma custom audience ainda.</TableCell></TableRow>}
                  {customs.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.nome}{a.descricao && <div className="text-xs text-muted-foreground font-normal">{a.descricao}</div>}</TableCell>
                      <TableCell className="text-right tabular-nums">{num(a.total_usuarios)}</TableCell>
                      <TableCell><Badge variant="outline" className={statusBadge(a.status)}>{a.status ?? "—"}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.created_at ? new Date(a.created_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" disabled={(a.status ?? "").toLowerCase() !== "pronta"} onClick={() => abrirLookalikeCom(a.id)} title={(a.status ?? "").toLowerCase() !== "pronta" ? "Disponível quando a audiência estiver pronta" : undefined}>
                          <Target className="h-3.5 w-3.5 mr-1" /> Criar lookalike
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lookalike">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Nome</TableHead><TableHead>Semente</TableHead><TableHead>Ratio</TableHead>
                  <TableHead>País</TableHead><TableHead>Status</TableHead><TableHead>Criada em</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {audiences.isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>}
                  {!audiences.isLoading && lookalikes.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Nenhuma lookalike ainda.</TableCell></TableRow>}
                  {lookalikes.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.nome}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.source_audience_id ? (nomePorId.get(a.source_audience_id) ?? "—") : "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="bg-blue-500/15 text-blue-600 border-blue-500/30">{a.ratio != null ? `${(a.ratio * 100).toFixed(0)}%` : "—"}</Badge></TableCell>
                      <TableCell className="text-xs">{a.pais ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={statusBadge(a.status)}>{a.status ?? "—"}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.created_at ? new Date(a.created_at).toLocaleDateString("pt-BR") : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CriarCustomDialog open={customOpen} onClose={() => setCustomOpen(false)} onCreated={() => { qc.invalidateQueries({ queryKey: ["mads", "audiences"] }); }} />
      <CriarLookalikeDialog open={lookalikeOpen} onClose={() => setLookalikeOpen(false)} customs={customs} seedId={lookalikeSeed} onCreated={() => { qc.invalidateQueries({ queryKey: ["mads", "audiences"] }); }} />
    </div>
  );
}

function CriarCustomDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoLead, setTipoLead] = useState("");
  const [faixas, setFaixas] = useState<string[]>([]);
  const [leadStatus, setLeadStatus] = useState("");
  const [createdAfter, setCreatedAfter] = useState("");
  const [contagem, setContagem] = useState<number | null>(null);
  const [estimando, setEstimando] = useState(false);
  const [loading, setLoading] = useState(false);

  async function estimar() {
    setEstimando(true);
    setContagem(null);
    try {
      let q = (supabase as any).from("contacts").select("id", { count: "exact", head: true }).is("deleted_at", null);
      if (faixas.length > 0) q = q.in("faixa_de_faturamento", faixas);
      if (leadStatus) q = q.eq("lead_status", leadStatus);
      if (createdAfter) q = q.gte("created_at", new Date(createdAfter).toISOString());
      const { count, error } = await q;
      if (error) throw error;
      setContagem(count ?? 0);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEstimando(false);
    }
  }

  async function criar() {
    setLoading(true);
    try {
      const r = await callEdgeFunction("meta-audiences", {
        acao: "create_custom_from_crm",
        nome,
        descricao: descricao || undefined,
        filtro: {
          tipo_lead: tipoLead || undefined,
          faixa_faturamento: faixas.length > 0 ? faixas : undefined,
          lead_status: leadStatus || undefined,
          created_after: createdAfter ? new Date(createdAfter).toISOString() : undefined,
        },
      });
      if (r.ok) {
        toast.success(`✅ Audience criada: ${num(r.audience?.total_usuarios)} contatos. ${r.nota ?? ""}`);
        onCreated();
        onClose();
      } else {
        toast.error(r.error ?? "Falha ao criar audiência.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Custom Audience do CRM</DialogTitle>
          <DialogDescription>Pega contatos do CRM pelos filtros, anonimiza (SHA-256) e envia pra Meta. Precisa de ≥ 100 contatos. Meta leva 6-24h pra processar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Nome da audiência</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Clientes Business R$1-5MM" /></div>
          <div className="space-y-1.5"><Label>Descrição (opcional)</Label><Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>

          <div className="rounded-md border p-3 space-y-3">
            <div className="text-sm font-medium">Filtros do CRM</div>
            <div className="space-y-1.5">
              <Label>Tipo de lead</Label>
              <Select value={tipoLead || "__any"} onValueChange={(v) => setTipoLead(v === "__any" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any">Qualquer</SelectItem>
                  {TIPO_LEAD.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Aplicado no servidor (não entra na estimativa abaixo).</p>
            </div>
            <div className="space-y-1.5">
              <Label>Faixa de faturamento</Label>
              <div className="grid grid-cols-1 gap-1.5">
                {FAIXAS.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={faixas.includes(f)} onCheckedChange={(c) => setFaixas((prev) => c ? [...prev, f] : prev.filter((x) => x !== f))} />
                    {f}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lead status</Label>
                <Select value={leadStatus || "__any"} onValueChange={(v) => setLeadStatus(v === "__any" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any">Qualquer</SelectItem>
                    <SelectItem value="qualificado">Qualificado</SelectItem>
                    <SelectItem value="ganho">Ganho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Criados depois de</Label>
                <Input type="date" value={createdAfter} onChange={(e) => setCreatedAfter(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={estimar} disabled={estimando}>
              {estimando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />} Estimar contatos
            </Button>
            {contagem != null && (
              <span className={`text-sm ${contagem < 100 ? "text-red-600" : "text-emerald-600"}`}>
                {num(contagem)} contatos {contagem < 100 && "(mínimo 100)"}
              </span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={criar} disabled={loading || !nome.trim() || (contagem != null && contagem < 100)}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Criar Custom Audience
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CriarLookalikeDialog({ open, onClose, customs, seedId, onCreated }: { open: boolean; onClose: () => void; customs: Audience[]; seedId: string; onCreated: () => void }) {
  const prontas = customs.filter((a) => (a.status ?? "").toLowerCase() === "pronta");
  const [nome, setNome] = useState("");
  const [source, setSource] = useState("");
  const [ratio, setRatio] = useState("0.01");
  const [pais, setPais] = useState("BR");
  const [loading, setLoading] = useState(false);

  // Sincroniza a semente quando aberto a partir de uma custom específica.
  if (open && seedId && source !== seedId && prontas.some((a) => a.id === seedId)) {
    setSource(seedId);
  }

  async function criar() {
    if (!source) {
      toast.error("Selecione a audiência semente.");
      return;
    }
    setLoading(true);
    try {
      const r = await callEdgeFunction("meta-audiences", {
        acao: "create_lookalike",
        nome,
        source_local_id: source,
        pais,
        ratio: parseFloat(ratio),
      });
      if (r.ok) {
        toast.success(`✅ Lookalike criada. ${r.nota ?? "Meta leva 6-24h."}`);
        onCreated();
        onClose();
      } else {
        toast.error(r.error ?? "Falha ao criar lookalike.");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Lookalike Audience</DialogTitle>
          <DialogDescription>A Meta encontra usuários similares à semente. Ratio menor (1%) = mais parecidos, menos alcance; maior (10%) = menos parecidos, mais alcance.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Nome da Lookalike</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Lookalike 1% Clientes Business" /></div>
          <div className="space-y-1.5">
            <Label>Audiência semente (Custom pronta)</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger><SelectValue placeholder={prontas.length ? "Selecione" : "Nenhuma custom pronta ainda"} /></SelectTrigger>
              <SelectContent>
                {prontas.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome} ({num(a.total_usuarios)} usuários)</SelectItem>)}
              </SelectContent>
            </Select>
            {prontas.length === 0 && <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> Lookalike só pode ser criada a partir de uma custom com status "pronta" (Meta leva 6-24h).</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Ratio (% da população do país)</Label>
            <RadioGroup value={ratio} onValueChange={setRatio} className="space-y-1.5">
              {RATIOS.map((r) => (
                <label key={r.v} className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value={r.v} /> {r.l}</label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-1.5">
            <Label>País</Label>
            <Select value={pais} onValueChange={setPais}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BR">Brasil</SelectItem>
                <SelectItem value="US">EUA</SelectItem>
                <SelectItem value="PT">Portugal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={criar} disabled={loading || !nome.trim() || !source}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />} Criar Lookalike
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
