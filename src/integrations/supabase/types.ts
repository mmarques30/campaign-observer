export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      _tmp_b64_chunks: {
        Row: {
          chunk: string | null
          ord: number
        }
        Insert: {
          chunk?: string | null
          ord: number
        }
        Update: {
          chunk?: string | null
          ord?: number
        }
        Relationships: []
      }
      acessos: {
        Row: {
          created_at: string | null
          data: string
          id: string
          novos_usuarios: number | null
          projeto_id: string
          sessoes: number | null
          usuarios_ativos: number | null
        }
        Insert: {
          created_at?: string | null
          data: string
          id?: string
          novos_usuarios?: number | null
          projeto_id: string
          sessoes?: number | null
          usuarios_ativos?: number | null
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: string
          novos_usuarios?: number | null
          projeto_id?: string
          sessoes?: number | null
          usuarios_ativos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "acessos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acessos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acessos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "acessos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          body: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          deal_id: string | null
          direction: string | null
          id: string
          metadata: Json | null
          subject: string | null
          type: string
        }
        Insert: {
          body?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          direction?: string | null
          id?: string
          metadata?: Json | null
          subject?: string | null
          type: string
        }
        Update: {
          body?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          deal_id?: string | null
          direction?: string | null
          id?: string
          metadata?: Json | null
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
        ]
      }
      ad_spend_manual: {
        Row: {
          ano: number
          canal: string
          created_at: string | null
          id: string
          mes: number
          valor: number
        }
        Insert: {
          ano: number
          canal: string
          created_at?: string | null
          id?: string
          mes: number
          valor?: number
        }
        Update: {
          ano?: number
          canal?: string
          created_at?: string | null
          id?: string
          mes?: number
          valor?: number
        }
        Relationships: []
      }
      aderencia_daily_exclusoes: {
        Row: {
          created_at: string
          nome: string
        }
        Insert: {
          created_at?: string
          nome: string
        }
        Update: {
          created_at?: string
          nome?: string
        }
        Relationships: []
      }
      alertas_enviados: {
        Row: {
          canal: string
          destinatario: string | null
          erro_id: string | null
          id: string
          mensagem: string | null
          projeto_id: string | null
          sucesso: boolean | null
          timestamp: string | null
          tipo: string
        }
        Insert: {
          canal: string
          destinatario?: string | null
          erro_id?: string | null
          id?: string
          mensagem?: string | null
          projeto_id?: string | null
          sucesso?: boolean | null
          timestamp?: string | null
          tipo: string
        }
        Update: {
          canal?: string
          destinatario?: string | null
          erro_id?: string | null
          id?: string
          mensagem?: string | null
          projeto_id?: string | null
          sucesso?: boolean | null
          timestamp?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_enviados_erro_id_fkey"
            columns: ["erro_id"]
            isOneToOne: false
            referencedRelation: "erros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_enviados_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_enviados_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_enviados_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "alertas_enviados_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      alocacao_projeto: {
        Row: {
          created_at: string
          equipe_id: string
          id: string
          percentual: number
          projeto_id: string
        }
        Insert: {
          created_at?: string
          equipe_id: string
          id?: string
          percentual?: number
          projeto_id: string
        }
        Update: {
          created_at?: string
          equipe_id?: string
          id?: string
          percentual?: number
          projeto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alocacao_projeto_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipe_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacao_projeto_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacao_projeto_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alocacao_projeto_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "alocacao_projeto_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_log: {
        Row: {
          created_at: string
          custo_usd: number
          data: string
          deal_id: string | null
          id: string
          input_tokens: number
          metadata: Json | null
          model: string | null
          origem: string
          output_tokens: number
          pessoa: string | null
          projeto_id: string | null
          provider: string
        }
        Insert: {
          created_at?: string
          custo_usd?: number
          data?: string
          deal_id?: string | null
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model?: string | null
          origem: string
          output_tokens?: number
          pessoa?: string | null
          projeto_id?: string | null
          provider?: string
        }
        Update: {
          created_at?: string
          custo_usd?: number
          data?: string
          deal_id?: string | null
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model?: string | null
          origem?: string
          output_tokens?: number
          pessoa?: string | null
          projeto_id?: string | null
          provider?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      area_dailies: {
        Row: {
          area: string
          autor: string
          bloqueios: string | null
          created_at: string
          data: string
          fez: string | null
          foco: string | null
          id: string
          nao_fez: string | null
          saude: string | null
          tema_id: string | null
        }
        Insert: {
          area: string
          autor: string
          bloqueios?: string | null
          created_at?: string
          data?: string
          fez?: string | null
          foco?: string | null
          id?: string
          nao_fez?: string | null
          saude?: string | null
          tema_id?: string | null
        }
        Update: {
          area?: string
          autor?: string
          bloqueios?: string | null
          created_at?: string
          data?: string
          fez?: string | null
          foco?: string | null
          id?: string
          nao_fez?: string | null
          saude?: string | null
          tema_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "area_dailies_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "area_temas"
            referencedColumns: ["id"]
          },
        ]
      }
      area_tarefas: {
        Row: {
          area: string
          created_at: string
          created_by: string | null
          descricao: string | null
          feita_em: string | null
          id: string
          prazo: string | null
          responsavel: string | null
          status: string
          tema_id: string | null
          titulo: string
        }
        Insert: {
          area: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          feita_em?: string | null
          id?: string
          prazo?: string | null
          responsavel?: string | null
          status?: string
          tema_id?: string | null
          titulo: string
        }
        Update: {
          area?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          feita_em?: string | null
          id?: string
          prazo?: string | null
          responsavel?: string | null
          status?: string
          tema_id?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "area_tarefas_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "area_temas"
            referencedColumns: ["id"]
          },
        ]
      }
      area_temas: {
        Row: {
          area: string
          created_at: string
          created_by: string | null
          id: string
          nome: string
          objetivo: string | null
          prazo: string | null
          status: string
        }
        Insert: {
          area: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          objetivo?: string | null
          prazo?: string | null
          status?: string
        }
        Update: {
          area?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          objetivo?: string | null
          prazo?: string | null
          status?: string
        }
        Relationships: []
      }
      assinatura_pessoas: {
        Row: {
          assinatura_id: string
          created_at: string
          id: string
          papel: string | null
          pessoa: string
        }
        Insert: {
          assinatura_id: string
          created_at?: string
          id?: string
          papel?: string | null
          pessoa: string
        }
        Update: {
          assinatura_id?: string
          created_at?: string
          id?: string
          papel?: string | null
          pessoa?: string
        }
        Relationships: [
          {
            foreignKeyName: "assinatura_pessoas_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas_ferramentas"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas_ferramentas: {
        Row: {
          ativo: boolean
          cambio_brl: number
          created_at: string
          custo_mensal: number
          fornecedor: string | null
          id: string
          moeda: string
          nome: string
          observacao: string | null
          rateio: string
        }
        Insert: {
          ativo?: boolean
          cambio_brl?: number
          created_at?: string
          custo_mensal?: number
          fornecedor?: string | null
          id?: string
          moeda?: string
          nome: string
          observacao?: string | null
          rateio?: string
        }
        Update: {
          ativo?: boolean
          cambio_brl?: number
          created_at?: string
          custo_mensal?: number
          fornecedor?: string | null
          id?: string
          moeda?: string
          nome?: string
          observacao?: string | null
          rateio?: string
        }
        Relationships: []
      }
      avaliacoes_comportamentais: {
        Row: {
          assiduidade_sprints: number
          atendimento_cliente: number
          avaliacao_id: string
          comportamento: number
          created_at: string
          id: string
          media: number | null
          preenchimento_demandas: number
          relacionamento: number
          reportes: number
        }
        Insert: {
          assiduidade_sprints?: number
          atendimento_cliente?: number
          avaliacao_id: string
          comportamento?: number
          created_at?: string
          id?: string
          media?: number | null
          preenchimento_demandas?: number
          relacionamento?: number
          reportes?: number
        }
        Update: {
          assiduidade_sprints?: number
          atendimento_cliente?: number
          avaliacao_id?: string
          comportamento?: number
          created_at?: string
          id?: string
          media?: number | null
          preenchimento_demandas?: number
          relacionamento?: number
          reportes?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_comportamentais_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: true
            referencedRelation: "avaliacoes_mensais"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_entregas: {
        Row: {
          atenuante: string | null
          avaliacao_id: string
          created_at: string
          detrator_bug_critico: boolean
          detrator_padrao_tecnico: boolean
          detrator_retrabalho: boolean
          id: string
          observacao: string | null
          percentual_deducao: number
          pontos_base: number
          pontos_finais: number
          projeto_nome: string | null
          sprint_nome: string | null
          task_id: string | null
          tipo_entrega: string
          titulo: string
        }
        Insert: {
          atenuante?: string | null
          avaliacao_id: string
          created_at?: string
          detrator_bug_critico?: boolean
          detrator_padrao_tecnico?: boolean
          detrator_retrabalho?: boolean
          id?: string
          observacao?: string | null
          percentual_deducao?: number
          pontos_base?: number
          pontos_finais?: number
          projeto_nome?: string | null
          sprint_nome?: string | null
          task_id?: string | null
          tipo_entrega?: string
          titulo: string
        }
        Update: {
          atenuante?: string | null
          avaliacao_id?: string
          created_at?: string
          detrator_bug_critico?: boolean
          detrator_padrao_tecnico?: boolean
          detrator_retrabalho?: boolean
          id?: string
          observacao?: string | null
          percentual_deducao?: number
          pontos_base?: number
          pontos_finais?: number
          projeto_nome?: string | null
          sprint_nome?: string | null
          task_id?: string | null
          tipo_entrega?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_entregas_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes_mensais"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_mensais: {
        Row: {
          bonus_calculado: number | null
          created_at: string
          created_by: string | null
          dev_id: string
          dev_nome: string
          id: string
          media_comportamental: number | null
          mes_referencia: string
          observacoes_gestao: string | null
          relatorio_ia: string | null
          status: string
          total_deducoes: number | null
          total_pontos_ajustados: number | null
          total_pontos_base: number | null
          updated_at: string
          valor_ponto: number
        }
        Insert: {
          bonus_calculado?: number | null
          created_at?: string
          created_by?: string | null
          dev_id: string
          dev_nome: string
          id?: string
          media_comportamental?: number | null
          mes_referencia: string
          observacoes_gestao?: string | null
          relatorio_ia?: string | null
          status?: string
          total_deducoes?: number | null
          total_pontos_ajustados?: number | null
          total_pontos_base?: number | null
          updated_at?: string
          valor_ponto?: number
        }
        Update: {
          bonus_calculado?: number | null
          created_at?: string
          created_by?: string | null
          dev_id?: string
          dev_nome?: string
          id?: string
          media_comportamental?: number | null
          mes_referencia?: string
          observacoes_gestao?: string | null
          relatorio_ia?: string | null
          status?: string
          total_deducoes?: number | null
          total_pontos_ajustados?: number | null
          total_pontos_base?: number | null
          updated_at?: string
          valor_ponto?: number
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          agencia: string | null
          apelido: string | null
          ativo: boolean
          banco: string
          conta: string | null
          created_at: string
          id: string
          klavi_connection_id: string | null
          nubank_client_id: string | null
          saldo_atual: number
          saldo_atualizado_em: string | null
        }
        Insert: {
          agencia?: string | null
          apelido?: string | null
          ativo?: boolean
          banco?: string
          conta?: string | null
          created_at?: string
          id?: string
          klavi_connection_id?: string | null
          nubank_client_id?: string | null
          saldo_atual?: number
          saldo_atualizado_em?: string | null
        }
        Update: {
          agencia?: string | null
          apelido?: string | null
          ativo?: boolean
          banco?: string
          conta?: string | null
          created_at?: string
          id?: string
          klavi_connection_id?: string | null
          nubank_client_id?: string | null
          saldo_atual?: number
          saldo_atualizado_em?: string | null
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          bank_account_id: string | null
          canal: string
          categoria: string | null
          contraparte_documento: string | null
          contraparte_nome: string | null
          created_at: string
          data: string
          descricao: string | null
          despesa_id: string | null
          external_id: string
          id: string
          metodo: string | null
          parcela_id: string | null
          raw_payload: Json | null
          reconciliado_em: string | null
          reconciliado_por: string | null
          status_reconciliacao: string
          tipo: string
          valor: number
          venda_id: string | null
        }
        Insert: {
          bank_account_id?: string | null
          canal?: string
          categoria?: string | null
          contraparte_documento?: string | null
          contraparte_nome?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          despesa_id?: string | null
          external_id: string
          id?: string
          metodo?: string | null
          parcela_id?: string | null
          raw_payload?: Json | null
          reconciliado_em?: string | null
          reconciliado_por?: string | null
          status_reconciliacao?: string
          tipo: string
          valor: number
          venda_id?: string | null
        }
        Update: {
          bank_account_id?: string | null
          canal?: string
          categoria?: string | null
          contraparte_documento?: string | null
          contraparte_nome?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          despesa_id?: string | null
          external_id?: string
          id?: string
          metodo?: string | null
          parcela_id?: string | null
          raw_payload?: Json | null
          reconciliado_em?: string | null
          reconciliado_por?: string | null
          status_reconciliacao?: string
          tipo?: string
          valor?: number
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_despesa_id_fkey"
            columns: ["despesa_id"]
            isOneToOne: false
            referencedRelation: "despesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_form_submissions: {
        Row: {
          created_at: string
          form_slug: string | null
          id: string
          ip: string | null
          page_url: string | null
          payload: Json | null
          reason: string | null
          referer: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          form_slug?: string | null
          id?: string
          ip?: string | null
          page_url?: string | null
          payload?: Json | null
          reason?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          form_slug?: string | null
          id?: string
          ip?: string | null
          page_url?: string | null
          payload?: Json | null
          reason?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      business_care: {
        Row: {
          contact_id: string
          created_at: string | null
          data_fim: string | null
          data_inicio: string
          deal_id: string | null
          id: string
          observacoes: string | null
          projeto_id: string | null
          sla_baixo_horas: number | null
          sla_critico_horas: number | null
          sla_medio_horas: number | null
          status: string
          updated_at: string | null
          valor_mensal: number
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio: string
          deal_id?: string | null
          id?: string
          observacoes?: string | null
          projeto_id?: string | null
          sla_baixo_horas?: number | null
          sla_critico_horas?: number | null
          sla_medio_horas?: number | null
          status?: string
          updated_at?: string | null
          valor_mensal: number
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          deal_id?: string | null
          id?: string
          observacoes?: string | null
          projeto_id?: string | null
          sla_baixo_horas?: number | null
          sla_critico_horas?: number | null
          sla_medio_horas?: number | null
          status?: string
          updated_at?: string | null
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_care_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_care_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_care_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_care_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_care_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "business_care_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "business_care_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_care_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_care_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "business_care_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_items: {
        Row: {
          campaign_id: string
          categoria: string
          created_at: string | null
          data_pagamento: string | null
          descricao: string
          forma_pagamento: string | null
          id: string
          parcelas: number
          status: string
          valor: number
        }
        Insert: {
          campaign_id: string
          categoria: string
          created_at?: string | null
          data_pagamento?: string | null
          descricao: string
          forma_pagamento?: string | null
          id?: string
          parcelas?: number
          status?: string
          valor: number
        }
        Update: {
          campaign_id?: string
          categoria?: string
          created_at?: string | null
          data_pagamento?: string | null
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          parcelas?: number
          status?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_campaigns_investimento_mes"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_campaigns_lista"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_list_contacts: {
        Row: {
          added_at: string
          contact_id: string
          list_id: string
        }
        Insert: {
          added_at?: string
          contact_id: string
          list_id: string
        }
        Update: {
          added_at?: string
          contact_id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_list_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_list_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_list_contacts_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "campaign_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_lists: {
        Row: {
          created_at: string
          created_by: string | null
          filter_criteria: Json | null
          id: string
          name: string
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          filter_criteria?: Json | null
          id?: string
          name: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          filter_criteria?: Json | null
          id?: string
          name?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campaign_send_requests: {
        Row: {
          collected: boolean
          dispatched_at: string
          id: string
          request_id: number
          send_id: string
        }
        Insert: {
          collected?: boolean
          dispatched_at?: string
          id?: string
          request_id: number
          send_id: string
        }
        Update: {
          collected?: boolean
          dispatched_at?: string
          id?: string
          request_id?: number
          send_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_send_requests_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "campaign_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_sends: {
        Row: {
          button_clicked_at: string | null
          campaign_id: string
          contact_id: string
          delivered_at: string | null
          error_code: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          last_inbound_at: string | null
          meta_message_id: string | null
          phone: string
          queued_at: string
          read_at: string | null
          replied_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          button_clicked_at?: string | null
          campaign_id: string
          contact_id: string
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          last_inbound_at?: string | null
          meta_message_id?: string | null
          phone: string
          queued_at?: string
          read_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          button_clicked_at?: string | null
          campaign_id?: string
          contact_id?: string
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          last_inbound_at?: string | null
          meta_message_id?: string | null
          phone?: string
          queued_at?: string
          read_at?: string | null
          replied_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_campaigns_investimento_mes"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "campaign_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_campaigns_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          button_click_count: number
          canal: string | null
          created_at: string
          created_by: string | null
          delivered_count: number
          failed_count: number
          finished_at: string | null
          group_key: string | null
          id: string
          list_id: string | null
          name: string
          opted_out_count: number
          period_end: string | null
          period_start: string | null
          pipeline_id: string | null
          read_count: number
          response_count: number
          responsible: string | null
          scheduled_at: string | null
          sent_count: number
          started_at: string | null
          status: string
          template_id: string | null
          total_recipients: number
          updated_at: string
        }
        Insert: {
          button_click_count?: number
          canal?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          finished_at?: string | null
          group_key?: string | null
          id?: string
          list_id?: string | null
          name: string
          opted_out_count?: number
          period_end?: string | null
          period_start?: string | null
          pipeline_id?: string | null
          read_count?: number
          response_count?: number
          responsible?: string | null
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          template_id?: string | null
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          button_click_count?: number
          canal?: string | null
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          finished_at?: string | null
          group_key?: string | null
          id?: string
          list_id?: string | null
          name?: string
          opted_out_count?: number
          period_end?: string | null
          period_start?: string | null
          pipeline_id?: string | null
          read_count?: number
          response_count?: number
          responsible?: string | null
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          template_id?: string | null
          total_recipients?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "campaign_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "meta_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_goals: {
        Row: {
          ano: number
          canal: string
          created_at: string
          id: string
          mes: number
          pipeline_id: string
          share_pct: number
          updated_at: string
        }
        Insert: {
          ano: number
          canal: string
          created_at?: string
          id?: string
          mes: number
          pipeline_id: string
          share_pct: number
          updated_at?: string
        }
        Update: {
          ano?: number
          canal?: string
          created_at?: string
          id?: string
          mes?: number
          pipeline_id?: string
          share_pct?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_goals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      ciclos: {
        Row: {
          ano: number | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          mes: number | null
          meta: string | null
          nome: string
          status: string
        }
        Insert: {
          ano?: number | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          mes?: number | null
          meta?: string | null
          nome: string
          status?: string
        }
        Update: {
          ano?: number | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          mes?: number | null
          meta?: string | null
          nome?: string
          status?: string
        }
        Relationships: []
      }
      client_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          zapi_phone: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          zapi_phone: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          zapi_phone?: string
        }
        Relationships: []
      }
      client_reminders: {
        Row: {
          client_id: string
          created_at: string | null
          description: string | null
          done_at: string | null
          due_date: string
          id: string
          is_done: boolean | null
          project_id: string | null
          recurrence: string | null
          reminder_type: string
          title: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          description?: string | null
          done_at?: string | null
          due_date: string
          id?: string
          is_done?: boolean | null
          project_id?: string | null
          recurrence?: string | null
          reminder_type?: string
          title: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          description?: string | null
          done_at?: string | null
          due_date?: string
          id?: string
          is_done?: boolean | null
          project_id?: string | null
          recurrence?: string | null
          reminder_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reminders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          contato_email: string | null
          contato_whatsapp: string | null
          created_at: string | null
          crm_client_id: string | null
          id: string
          nome: string
          observacoes: string | null
          segmento: string | null
          status_contrato: string | null
          updated_at: string | null
        }
        Insert: {
          contato_email?: string | null
          contato_whatsapp?: string | null
          created_at?: string | null
          crm_client_id?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          segmento?: string | null
          status_contrato?: string | null
          updated_at?: string | null
        }
        Update: {
          contato_email?: string | null
          contato_whatsapp?: string | null
          created_at?: string | null
          crm_client_id?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          segmento?: string | null
          status_contrato?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          contact_id: string | null
          created_at: string | null
          data_inicio: string | null
          data_venda: string | null
          descricao_projeto: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          parceiro_indicacao: string | null
          produto_venda: string | null
          produtos: string | null
          status: string
          telefone: string | null
          tipo_contrato: string
          tipo_programa: string | null
          total_parcelas: number | null
          updated_at: string | null
          valor_contrato: number | null
          valor_entrada: number | null
          venda_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          data_inicio?: string | null
          data_venda?: string | null
          descricao_projeto?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          parceiro_indicacao?: string | null
          produto_venda?: string | null
          produtos?: string | null
          status?: string
          telefone?: string | null
          tipo_contrato?: string
          tipo_programa?: string | null
          total_parcelas?: number | null
          updated_at?: string | null
          valor_contrato?: number | null
          valor_entrada?: number | null
          venda_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          data_inicio?: string | null
          data_venda?: string | null
          descricao_projeto?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          parceiro_indicacao?: string | null
          produto_venda?: string | null
          produtos?: string | null
          status?: string
          telefone?: string | null
          tipo_contrato?: string
          tipo_programa?: string | null
          total_parcelas?: number | null
          updated_at?: string | null
          valor_contrato?: number | null
          valor_entrada?: number | null
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      cockpit_reviews: {
        Row: {
          area: string
          created_at: string
          dados: Json | null
          descricao: string
          id: string
          projeto_id: string
          recomendacao: string
          resolvida_em: string | null
          severidade: string
          status: string
          tarefa_id: string | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          area: string
          created_at?: string
          dados?: Json | null
          descricao: string
          id?: string
          projeto_id: string
          recomendacao: string
          resolvida_em?: string | null
          severidade: string
          status?: string
          tarefa_id?: string | null
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          area?: string
          created_at?: string
          dados?: Json | null
          descricao?: string
          id?: string
          projeto_id?: string
          recomendacao?: string
          resolvida_em?: string | null
          severidade?: string
          status?: string
          tarefa_id?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cockpit_reviews_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cockpit_reviews_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cockpit_reviews_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "cockpit_reviews_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cockpit_reviews_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "sprint_tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cockpit_reviews_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["tarefa_id"]
          },
        ]
      }
      cockpit_snapshots: {
        Row: {
          code_alerts_abertos: number | null
          commits: number | null
          created_at: string
          data: string
          db_edge_functions_count: number | null
          db_riscos_count: number | null
          db_secrets_count: number | null
          db_size_bytes: number | null
          db_tabelas: number | null
          db_tabelas_sem_rls: number | null
          dependabot_abertos: number | null
          deploy_status: string | null
          erros_abertos: number | null
          health_response_ms: number | null
          health_status_code: number | null
          id: string
          projeto_id: string
          prs_abertos: number | null
          secret_alerts_abertos: number | null
          security_score: number | null
          supabase_status: string | null
        }
        Insert: {
          code_alerts_abertos?: number | null
          commits?: number | null
          created_at?: string
          data?: string
          db_edge_functions_count?: number | null
          db_riscos_count?: number | null
          db_secrets_count?: number | null
          db_size_bytes?: number | null
          db_tabelas?: number | null
          db_tabelas_sem_rls?: number | null
          dependabot_abertos?: number | null
          deploy_status?: string | null
          erros_abertos?: number | null
          health_response_ms?: number | null
          health_status_code?: number | null
          id?: string
          projeto_id: string
          prs_abertos?: number | null
          secret_alerts_abertos?: number | null
          security_score?: number | null
          supabase_status?: string | null
        }
        Update: {
          code_alerts_abertos?: number | null
          commits?: number | null
          created_at?: string
          data?: string
          db_edge_functions_count?: number | null
          db_riscos_count?: number | null
          db_secrets_count?: number | null
          db_size_bytes?: number | null
          db_tabelas?: number | null
          db_tabelas_sem_rls?: number | null
          dependabot_abertos?: number | null
          deploy_status?: string | null
          erros_abertos?: number | null
          health_response_ms?: number | null
          health_status_code?: number | null
          id?: string
          projeto_id?: string
          prs_abertos?: number | null
          secret_alerts_abertos?: number | null
          security_score?: number | null
          supabase_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cockpit_snapshots_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cockpit_snapshots_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cockpit_snapshots_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "cockpit_snapshots_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      commits_diarios_autor: {
        Row: {
          atualizado_em: string
          autor: string
          commits: number
          data: string
          id: string
          projeto_id: string
        }
        Insert: {
          atualizado_em?: string
          autor: string
          commits?: number
          data: string
          id?: string
          projeto_id: string
        }
        Update: {
          atualizado_em?: string
          autor?: string
          commits?: number
          data?: string
          id?: string
          projeto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commits_diarios_autor_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commits_diarios_autor_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commits_diarios_autor_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "commits_diarios_autor_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          emoji_padrao: string | null
          id: string
          nome: string
          objetivo: string | null
          slug: string
          tom_de_voz: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          emoji_padrao?: string | null
          id?: string
          nome: string
          objetivo?: string | null
          slug: string
          tom_de_voz?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          emoji_padrao?: string | null
          id?: string
          nome?: string
          objetivo?: string | null
          slug?: string
          tom_de_voz?: string | null
        }
        Relationships: []
      }
      contact_group_links: {
        Row: {
          contact_id: string
          created_at: string | null
          group_conversation_id: string
          id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          group_conversation_id: string
          id?: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          group_conversation_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_group_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_group_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_group_links_group_conversation_id_fkey"
            columns: ["group_conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_list_memberships: {
        Row: {
          added_at: string | null
          contact_id: string
          list_id: string
        }
        Insert: {
          added_at?: string | null
          contact_id: string
          list_id: string
        }
        Update: {
          added_at?: string | null
          contact_id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_list_memberships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_list_memberships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_list_memberships_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_lists: {
        Row: {
          contact_count: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          filters: Json | null
          id: string
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          contact_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          name: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          contact_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filters?: Json | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          area_atuacao: string | null
          avatar_fetched_at: string | null
          avatar_url: string | null
          cargo: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          deleted_at: string | null
          economia_mensal: number | null
          email: string | null
          email_2: string | null
          faixa_de_faturamento: string | null
          fbclid: string | null
          first_conversion: string | null
          first_conversion_date: string | null
          first_name: string
          fonte_registro: string | null
          gargalo_principal: string | null
          hubspot_id: number | null
          hubspot_owner: string | null
          id: string
          instagram_opt_in: boolean
          is_internal_user: boolean
          kind: string | null
          last_activity_at: string | null
          last_event_source_url: string | null
          last_fbc: string | null
          last_fbp: string | null
          last_ip_address: string | null
          last_name: string | null
          last_user_agent: string | null
          lead_score: number | null
          lead_status: string | null
          lead_tier: string | null
          lifecycle_stage: string | null
          linkedin_url: string | null
          manychat_id: string | null
          marketing_status: string | null
          motivo_para_aprender_ia: string | null
          notion_project_id: string | null
          numero_de_liderados: string | null
          objetivo_com_a_comunidade: string | null
          opted_out: boolean
          opted_out_at: string | null
          opted_out_reason: string | null
          origem_trafego: string | null
          owner_id: string | null
          phone: string | null
          phone_2: string | null
          produto_interesse: string[] | null
          renda_mensal: string | null
          state: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          website_url: string | null
          whatsapp: string | null
          whatsapp_2: string | null
          whatsapp_opt_in: boolean
          whatsapp_verified: boolean | null
          whatsapp_verified_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          area_atuacao?: string | null
          avatar_fetched_at?: string | null
          avatar_url?: string | null
          cargo?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          economia_mensal?: number | null
          email?: string | null
          email_2?: string | null
          faixa_de_faturamento?: string | null
          fbclid?: string | null
          first_conversion?: string | null
          first_conversion_date?: string | null
          first_name: string
          fonte_registro?: string | null
          gargalo_principal?: string | null
          hubspot_id?: number | null
          hubspot_owner?: string | null
          id?: string
          instagram_opt_in?: boolean
          is_internal_user?: boolean
          kind?: string | null
          last_activity_at?: string | null
          last_event_source_url?: string | null
          last_fbc?: string | null
          last_fbp?: string | null
          last_ip_address?: string | null
          last_name?: string | null
          last_user_agent?: string | null
          lead_score?: number | null
          lead_status?: string | null
          lead_tier?: string | null
          lifecycle_stage?: string | null
          linkedin_url?: string | null
          manychat_id?: string | null
          marketing_status?: string | null
          motivo_para_aprender_ia?: string | null
          notion_project_id?: string | null
          numero_de_liderados?: string | null
          objetivo_com_a_comunidade?: string | null
          opted_out?: boolean
          opted_out_at?: string | null
          opted_out_reason?: string | null
          origem_trafego?: string | null
          owner_id?: string | null
          phone?: string | null
          phone_2?: string | null
          produto_interesse?: string[] | null
          renda_mensal?: string | null
          state?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          website_url?: string | null
          whatsapp?: string | null
          whatsapp_2?: string | null
          whatsapp_opt_in?: boolean
          whatsapp_verified?: boolean | null
          whatsapp_verified_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          area_atuacao?: string | null
          avatar_fetched_at?: string | null
          avatar_url?: string | null
          cargo?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          economia_mensal?: number | null
          email?: string | null
          email_2?: string | null
          faixa_de_faturamento?: string | null
          fbclid?: string | null
          first_conversion?: string | null
          first_conversion_date?: string | null
          first_name?: string
          fonte_registro?: string | null
          gargalo_principal?: string | null
          hubspot_id?: number | null
          hubspot_owner?: string | null
          id?: string
          instagram_opt_in?: boolean
          is_internal_user?: boolean
          kind?: string | null
          last_activity_at?: string | null
          last_event_source_url?: string | null
          last_fbc?: string | null
          last_fbp?: string | null
          last_ip_address?: string | null
          last_name?: string | null
          last_user_agent?: string | null
          lead_score?: number | null
          lead_status?: string | null
          lead_tier?: string | null
          lifecycle_stage?: string | null
          linkedin_url?: string | null
          manychat_id?: string | null
          marketing_status?: string | null
          motivo_para_aprender_ia?: string | null
          notion_project_id?: string | null
          numero_de_liderados?: string | null
          objetivo_com_a_comunidade?: string | null
          opted_out?: boolean
          opted_out_at?: string | null
          opted_out_reason?: string | null
          origem_trafego?: string | null
          owner_id?: string | null
          phone?: string | null
          phone_2?: string | null
          produto_interesse?: string[] | null
          renda_mensal?: string | null
          state?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          website_url?: string | null
          whatsapp?: string | null
          whatsapp_2?: string | null
          whatsapp_opt_in?: boolean
          whatsapp_verified?: boolean | null
          whatsapp_verified_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      content_items: {
        Row: {
          anexos_links: string | null
          anuncio_nome_meta: string | null
          anuncio_publico: string | null
          auto_resposta_ativa: boolean | null
          auto_resposta_msg: string | null
          auto_resposta_palavra_chave: string | null
          categoria: string | null
          created_at: string | null
          data_final_edicao: string | null
          data_gravacao: string | null
          data_necessidade: string | null
          data_publicacao: string | null
          data_publicacao_programada: string | null
          deadline: string | null
          descricao: string | null
          duracao: string | null
          finalidade: string | null
          id: string
          legenda: string | null
          link_referencia: string | null
          ordem_edicao: number | null
          plataforma: string | null
          plataformas: string[] | null
          prioridade: string | null
          prioridade_edicao: string | null
          produto: string | null
          recomendacoes_edicao: string | null
          responsavel_edicao: string | null
          responsavel_gravacao: string | null
          responsavel_id: string | null
          responsavel_revisao: string | null
          responsavel_roteiro: string | null
          roteiro: string | null
          status: string | null
          tipo_video: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          anexos_links?: string | null
          anuncio_nome_meta?: string | null
          anuncio_publico?: string | null
          auto_resposta_ativa?: boolean | null
          auto_resposta_msg?: string | null
          auto_resposta_palavra_chave?: string | null
          categoria?: string | null
          created_at?: string | null
          data_final_edicao?: string | null
          data_gravacao?: string | null
          data_necessidade?: string | null
          data_publicacao?: string | null
          data_publicacao_programada?: string | null
          deadline?: string | null
          descricao?: string | null
          duracao?: string | null
          finalidade?: string | null
          id?: string
          legenda?: string | null
          link_referencia?: string | null
          ordem_edicao?: number | null
          plataforma?: string | null
          plataformas?: string[] | null
          prioridade?: string | null
          prioridade_edicao?: string | null
          produto?: string | null
          recomendacoes_edicao?: string | null
          responsavel_edicao?: string | null
          responsavel_gravacao?: string | null
          responsavel_id?: string | null
          responsavel_revisao?: string | null
          responsavel_roteiro?: string | null
          roteiro?: string | null
          status?: string | null
          tipo_video?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          anexos_links?: string | null
          anuncio_nome_meta?: string | null
          anuncio_publico?: string | null
          auto_resposta_ativa?: boolean | null
          auto_resposta_msg?: string | null
          auto_resposta_palavra_chave?: string | null
          categoria?: string | null
          created_at?: string | null
          data_final_edicao?: string | null
          data_gravacao?: string | null
          data_necessidade?: string | null
          data_publicacao?: string | null
          data_publicacao_programada?: string | null
          deadline?: string | null
          descricao?: string | null
          duracao?: string | null
          finalidade?: string | null
          id?: string
          legenda?: string | null
          link_referencia?: string | null
          ordem_edicao?: number | null
          plataforma?: string | null
          plataformas?: string[] | null
          prioridade?: string | null
          prioridade_edicao?: string | null
          produto?: string | null
          recomendacoes_edicao?: string | null
          responsavel_edicao?: string | null
          responsavel_gravacao?: string | null
          responsavel_id?: string | null
          responsavel_revisao?: string | null
          responsavel_roteiro?: string | null
          roteiro?: string | null
          status?: string | null
          tipo_video?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "team_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_manual_links: {
        Row: {
          a_conversation_id: string
          b_conversation_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
        }
        Insert: {
          a_conversation_id: string
          b_conversation_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
        }
        Update: {
          a_conversation_id?: string
          b_conversation_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_manual_links_a_conversation_id_fkey"
            columns: ["a_conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_manual_links_b_conversation_id_fkey"
            columns: ["b_conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_items: {
        Row: {
          anexos_links: string | null
          created_at: string | null
          data_publicacao: string | null
          deadline: string | null
          descricao: string | null
          formato: string
          id: string
          legenda: string | null
          link_arquivo: string | null
          link_referencia: string | null
          plataforma: string | null
          plataformas: string[] | null
          prioridade: string | null
          produto: string | null
          recomendacoes: string | null
          responsavel_id: string | null
          status: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          anexos_links?: string | null
          created_at?: string | null
          data_publicacao?: string | null
          deadline?: string | null
          descricao?: string | null
          formato?: string
          id?: string
          legenda?: string | null
          link_arquivo?: string | null
          link_referencia?: string | null
          plataforma?: string | null
          plataformas?: string[] | null
          prioridade?: string | null
          produto?: string | null
          recomendacoes?: string | null
          responsavel_id?: string | null
          status?: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          anexos_links?: string | null
          created_at?: string | null
          data_publicacao?: string | null
          deadline?: string | null
          descricao?: string | null
          formato?: string
          id?: string
          legenda?: string | null
          link_arquivo?: string | null
          link_referencia?: string | null
          plataforma?: string | null
          plataformas?: string[] | null
          prioridade?: string | null
          produto?: string | null
          recomendacoes?: string | null
          responsavel_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dailies: {
        Row: {
          autor: string
          bloqueios: string | null
          created_at: string | null
          data: string
          fez: string | null
          id: string
          nao_fez: string | null
          projeto_id: string
          saude: string | null
          sprint_id: string | null
        }
        Insert: {
          autor: string
          bloqueios?: string | null
          created_at?: string | null
          data?: string
          fez?: string | null
          id?: string
          nao_fez?: string | null
          projeto_id: string
          saude?: string | null
          sprint_id?: string | null
        }
        Update: {
          autor?: string
          bloqueios?: string | null
          created_at?: string | null
          data?: string
          fez?: string | null
          id?: string
          nao_fez?: string | null
          projeto_id?: string
          saude?: string | null
          sprint_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dailies_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dailies_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dailies_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "dailies_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dailies_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dailies_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["sprint_id"]
          },
        ]
      }
      daily_reviews: {
        Row: {
          acao_sugerida: string
          approved_at: string | null
          categoria: string | null
          conversation_id: string
          created_at: string
          framing_dia: string | null
          id: string
          notes_humano: string | null
          notion_context: Json | null
          resposta_proposta: string | null
          reviewed_at: string
          sent_message_id: string | null
          status: string
          ultima_msg_at: string | null
          ultima_msg_body: string | null
          ultima_msg_id: string | null
          urgencia: string
        }
        Insert: {
          acao_sugerida: string
          approved_at?: string | null
          categoria?: string | null
          conversation_id: string
          created_at?: string
          framing_dia?: string | null
          id?: string
          notes_humano?: string | null
          notion_context?: Json | null
          resposta_proposta?: string | null
          reviewed_at?: string
          sent_message_id?: string | null
          status?: string
          ultima_msg_at?: string | null
          ultima_msg_body?: string | null
          ultima_msg_id?: string | null
          urgencia: string
        }
        Update: {
          acao_sugerida?: string
          approved_at?: string | null
          categoria?: string | null
          conversation_id?: string
          created_at?: string
          framing_dia?: string | null
          id?: string
          notes_humano?: string | null
          notion_context?: Json | null
          resposta_proposta?: string | null
          reviewed_at?: string
          sent_message_id?: string | null
          status?: string
          ultima_msg_at?: string | null
          ultima_msg_body?: string | null
          ultima_msg_id?: string | null
          urgencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reviews_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reviews_ultima_msg_id_fkey"
            columns: ["ultima_msg_id"]
            isOneToOne: false
            referencedRelation: "v_msgs_stuck_undelivered"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reviews_ultima_msg_id_fkey"
            columns: ["ultima_msg_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_snapshots: {
        Row: {
          collected_at: string | null
          data: Json
          errors: string[] | null
          id: string
          source: string
        }
        Insert: {
          collected_at?: string | null
          data?: Json
          errors?: string[] | null
          id?: string
          source: string
        }
        Update: {
          collected_at?: string | null
          data?: Json
          errors?: string[] | null
          id?: string
          source?: string
        }
        Relationships: []
      }
      dashboards: {
        Row: {
          created_at: string | null
          html: string
          id: string
        }
        Insert: {
          created_at?: string | null
          html: string
          id: string
        }
        Update: {
          created_at?: string | null
          html?: string
          id?: string
        }
        Relationships: []
      }
      deal_activities: {
        Row: {
          ai_next_steps: Json | null
          ai_sentiment: string | null
          ai_summary: string | null
          ai_topics: Json | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          duration_sec: number | null
          ended_at: string | null
          event_status: string | null
          external_id: string | null
          id: string
          meet_link: string | null
          metadata: Json
          participants: Json
          recording_url: string | null
          scheduled_by_user_id: string | null
          source: string
          started_at: string | null
          title: string | null
          transcript: string | null
          type: string
          updated_at: string
        }
        Insert: {
          ai_next_steps?: Json | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          ai_topics?: Json | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          duration_sec?: number | null
          ended_at?: string | null
          event_status?: string | null
          external_id?: string | null
          id?: string
          meet_link?: string | null
          metadata?: Json
          participants?: Json
          recording_url?: string | null
          scheduled_by_user_id?: string | null
          source: string
          started_at?: string | null
          title?: string | null
          transcript?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          ai_next_steps?: Json | null
          ai_sentiment?: string | null
          ai_summary?: string | null
          ai_topics?: Json | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          duration_sec?: number | null
          ended_at?: string | null
          event_status?: string | null
          external_id?: string | null
          id?: string
          meet_link?: string | null
          metadata?: Json
          participants?: Json
          recording_url?: string | null
          scheduled_by_user_id?: string | null
          source?: string
          started_at?: string | null
          title?: string | null
          transcript?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
        ]
      }
      deal_inconsistencies: {
        Row: {
          conversation_value: string | null
          deal_id: string
          detected_at: string | null
          field_name: string
          form_value: string | null
          id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          source_message_id: string | null
        }
        Insert: {
          conversation_value?: string | null
          deal_id: string
          detected_at?: string | null
          field_name: string
          form_value?: string | null
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_message_id?: string | null
        }
        Update: {
          conversation_value?: string | null
          deal_id?: string
          detected_at?: string | null
          field_name?: string
          form_value?: string | null
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_inconsistencies_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_inconsistencies_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_inconsistencies_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deal_inconsistencies_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
        ]
      }
      deal_stage_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          deal_id: string
          duration_seconds: number | null
          entered_at: string
          exited_at: string | null
          from_stage_id: string | null
          from_stage_name: string | null
          id: string
          owner_id: string | null
          to_stage_id: string
          to_stage_name: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          deal_id: string
          duration_seconds?: number | null
          entered_at?: string
          exited_at?: string | null
          from_stage_id?: string | null
          from_stage_name?: string | null
          id?: string
          owner_id?: string | null
          to_stage_id: string
          to_stage_name?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          deal_id?: string
          duration_seconds?: number | null
          entered_at?: string
          exited_at?: string | null
          from_stage_id?: string | null
          from_stage_name?: string | null
          id?: string
          owner_id?: string | null
          to_stage_id?: string
          to_stage_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deal_stage_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_tasks: {
        Row: {
          assigned_to: string | null
          concluida_at: string | null
          contact_id: string | null
          created_at: string | null
          created_by: string | null
          data_prevista: string
          deadline_overdue_sent_at: string | null
          deadline_warning_sent_at: string | null
          deal_id: string
          descricao: string | null
          id: string
          notificado: boolean | null
          resultado: string | null
          status: string
          subtipo: string | null
          tipo: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          concluida_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_prevista: string
          deadline_overdue_sent_at?: string | null
          deadline_warning_sent_at?: string | null
          deal_id: string
          descricao?: string | null
          id?: string
          notificado?: boolean | null
          resultado?: string | null
          status?: string
          subtipo?: string | null
          tipo: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          concluida_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string | null
          data_prevista?: string
          deadline_overdue_sent_at?: string | null
          deadline_warning_sent_at?: string | null
          deal_id?: string
          descricao?: string | null
          id?: string
          notificado?: boolean | null
          resultado?: string | null
          status?: string
          subtipo?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deal_tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
        ]
      }
      deals: {
        Row: {
          amount: number | null
          assigned_to: string | null
          bot_inbound_origin: boolean | null
          bot_notes: Json | null
          cadence_status: string | null
          calculadora_preenchida_at: string | null
          canal_origem: string | null
          closed_at: string | null
          contact_id: string | null
          created_at: string | null
          deal_status: string | null
          deal_type: string
          economia_horas_mes: number | null
          economia_reais_mes: number | null
          faixa_faturamento: string | null
          first_seen_by_human_at: string | null
          forecast_declarado: number | null
          forecast_tags: string[] | null
          form_origin: string | null
          hubspot_id: number | null
          id: string
          is_aditivo: boolean | null
          is_won: boolean | null
          lead_status: string | null
          lost_reason: string | null
          motivo_perda: string | null
          mql_silent_alert_sent_at: string | null
          name: string
          observacoes: string | null
          owner_id: string | null
          owner_state: string | null
          owner_state_changed_at: string | null
          pain_principal: string | null
          parent_deal_id: string | null
          periodo_preferido_diagnostico: string | null
          pipeline_id: string
          por_indicacao: boolean | null
          prev_liquidez: string | null
          product: string
          proposal_link: string | null
          proposal_links: Json | null
          qualification_status: string
          recontato_em: string | null
          roi_estimado: number | null
          sal_cargo_decisao_confirmado: boolean | null
          sal_faturamento_confirmado: boolean | null
          sal_outcome: string | null
          sal_qualified_at: string | null
          sal_qualified_by: string | null
          sal_rejection_detail: string | null
          sal_rejection_reason: string | null
          stage_entered_at: string | null
          stage_id: string
          tag_forecast: string | null
          tags: string[] | null
          tentativas_contato: number | null
          ultimo_contato: string | null
          updated_at: string | null
          valor_declarado: number | null
          valor_fechamento: number | null
          valor_reajustado: number | null
          whatsapp_send_status: string | null
        }
        Insert: {
          amount?: number | null
          assigned_to?: string | null
          bot_inbound_origin?: boolean | null
          bot_notes?: Json | null
          cadence_status?: string | null
          calculadora_preenchida_at?: string | null
          canal_origem?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_status?: string | null
          deal_type?: string
          economia_horas_mes?: number | null
          economia_reais_mes?: number | null
          faixa_faturamento?: string | null
          first_seen_by_human_at?: string | null
          forecast_declarado?: number | null
          forecast_tags?: string[] | null
          form_origin?: string | null
          hubspot_id?: number | null
          id?: string
          is_aditivo?: boolean | null
          is_won?: boolean | null
          lead_status?: string | null
          lost_reason?: string | null
          motivo_perda?: string | null
          mql_silent_alert_sent_at?: string | null
          name: string
          observacoes?: string | null
          owner_id?: string | null
          owner_state?: string | null
          owner_state_changed_at?: string | null
          pain_principal?: string | null
          parent_deal_id?: string | null
          periodo_preferido_diagnostico?: string | null
          pipeline_id: string
          por_indicacao?: boolean | null
          prev_liquidez?: string | null
          product?: string
          proposal_link?: string | null
          proposal_links?: Json | null
          qualification_status?: string
          recontato_em?: string | null
          roi_estimado?: number | null
          sal_cargo_decisao_confirmado?: boolean | null
          sal_faturamento_confirmado?: boolean | null
          sal_outcome?: string | null
          sal_qualified_at?: string | null
          sal_qualified_by?: string | null
          sal_rejection_detail?: string | null
          sal_rejection_reason?: string | null
          stage_entered_at?: string | null
          stage_id: string
          tag_forecast?: string | null
          tags?: string[] | null
          tentativas_contato?: number | null
          ultimo_contato?: string | null
          updated_at?: string | null
          valor_declarado?: number | null
          valor_fechamento?: number | null
          valor_reajustado?: number | null
          whatsapp_send_status?: string | null
        }
        Update: {
          amount?: number | null
          assigned_to?: string | null
          bot_inbound_origin?: boolean | null
          bot_notes?: Json | null
          cadence_status?: string | null
          calculadora_preenchida_at?: string | null
          canal_origem?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_status?: string | null
          deal_type?: string
          economia_horas_mes?: number | null
          economia_reais_mes?: number | null
          faixa_faturamento?: string | null
          first_seen_by_human_at?: string | null
          forecast_declarado?: number | null
          forecast_tags?: string[] | null
          form_origin?: string | null
          hubspot_id?: number | null
          id?: string
          is_aditivo?: boolean | null
          is_won?: boolean | null
          lead_status?: string | null
          lost_reason?: string | null
          motivo_perda?: string | null
          mql_silent_alert_sent_at?: string | null
          name?: string
          observacoes?: string | null
          owner_id?: string | null
          owner_state?: string | null
          owner_state_changed_at?: string | null
          pain_principal?: string | null
          parent_deal_id?: string | null
          periodo_preferido_diagnostico?: string | null
          pipeline_id?: string
          por_indicacao?: boolean | null
          prev_liquidez?: string | null
          product?: string
          proposal_link?: string | null
          proposal_links?: Json | null
          qualification_status?: string
          recontato_em?: string | null
          roi_estimado?: number | null
          sal_cargo_decisao_confirmado?: boolean | null
          sal_faturamento_confirmado?: boolean | null
          sal_outcome?: string | null
          sal_qualified_at?: string | null
          sal_qualified_by?: string | null
          sal_rejection_detail?: string | null
          sal_rejection_reason?: string | null
          stage_entered_at?: string | null
          stage_id?: string
          tag_forecast?: string | null
          tags?: string[] | null
          tentativas_contato?: number | null
          ultimo_contato?: string | null
          updated_at?: string | null
          valor_declarado?: number | null
          valor_fechamento?: number | null
          valor_reajustado?: number | null
          whatsapp_send_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_parent_deal_id_fkey"
            columns: ["parent_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_parent_deal_id_fkey"
            columns: ["parent_deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_parent_deal_id_fkey"
            columns: ["parent_deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deals_parent_deal_id_fkey"
            columns: ["parent_deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          categoria: string
          created_at: string | null
          data: string
          descricao: string
          forma_pgto: string | null
          id: string
          pagamento: string | null
          status: string
          tipo: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string | null
          data: string
          descricao: string
          forma_pgto?: string | null
          id?: string
          pagamento?: string | null
          status?: string
          tipo?: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string | null
          data?: string
          descricao?: string
          forma_pgto?: string | null
          id?: string
          pagamento?: string | null
          status?: string
          tipo?: string
          valor?: number
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          created_at: string | null
          created_by: string | null
          exclude_list_ids: string[] | null
          id: string
          include_list_ids: string[] | null
          name: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subscription_type: string | null
          template_id: string | null
          total_bounced: number | null
          total_clicked: number | null
          total_delivered: number | null
          total_opened: number | null
          total_recipients: number | null
          total_unsubscribed: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          exclude_list_ids?: string[] | null
          id?: string
          include_list_ids?: string[] | null
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subscription_type?: string | null
          template_id?: string | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_unsubscribed?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          exclude_list_ids?: string[] | null
          id?: string
          include_list_ids?: string[] | null
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subscription_type?: string | null
          template_id?: string | null
          total_bounced?: number | null
          total_clicked?: number | null
          total_delivered?: number | null
          total_opened?: number | null
          total_recipients?: number | null
          total_unsubscribed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      email_link_clicks: {
        Row: {
          clicked_at: string | null
          email_send_id: string
          id: string
          ip_address: string | null
          url: string
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string | null
          email_send_id: string
          id?: string
          ip_address?: string | null
          url: string
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string | null
          email_send_id?: string
          id?: string
          ip_address?: string | null
          url?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_link_clicks_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          bounce_type: string | null
          bounced_at: string | null
          campaign_id: string | null
          click_count: number | null
          clicked_at: string | null
          contact_id: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          from_email: string | null
          id: string
          open_count: number | null
          opened_at: string | null
          replied_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          spam_reported_at: string | null
          status: string
          subject_rendered: string | null
          template_id: string | null
          to_email: string | null
          unsubscribed_at: string | null
          workflow_id: string | null
        }
        Insert: {
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id?: string | null
          click_count?: number | null
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          from_email?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          replied_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          spam_reported_at?: string | null
          status?: string
          subject_rendered?: string | null
          template_id?: string | null
          to_email?: string | null
          unsubscribed_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          bounce_type?: string | null
          bounced_at?: string | null
          campaign_id?: string | null
          click_count?: number | null
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          from_email?: string | null
          id?: string
          open_count?: number | null
          opened_at?: string | null
          replied_at?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          spam_reported_at?: string | null
          status?: string
          subject_rendered?: string | null
          template_id?: string | null
          to_email?: string | null
          unsubscribed_at?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaign_metrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string | null
          delay_days: number
          id: string
          is_active: boolean
          product: string
          sequence_order: number
          subject: string
        }
        Insert: {
          body_html: string
          created_at?: string | null
          delay_days?: number
          id?: string
          is_active?: boolean
          product?: string
          sequence_order: number
          subject: string
        }
        Update: {
          body_html?: string
          created_at?: string | null
          delay_days?: number
          id?: string
          is_active?: boolean
          product?: string
          sequence_order?: number
          subject?: string
        }
        Relationships: []
      }
      email_templates_v2: {
        Row: {
          created_at: string | null
          created_by: string | null
          from_email: string
          from_name: string
          html_body: string
          id: string
          language: string | null
          name: string
          preview_text: string | null
          product: string | null
          reply_to: string | null
          status: string
          subject: string
          tags: string[] | null
          text_body: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          from_email?: string
          from_name?: string
          html_body?: string
          id?: string
          language?: string | null
          name: string
          preview_text?: string | null
          product?: string | null
          reply_to?: string | null
          status?: string
          subject: string
          tags?: string[] | null
          text_body?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          from_email?: string
          from_name?: string
          html_body?: string
          id?: string
          language?: string | null
          name?: string
          preview_text?: string | null
          product?: string | null
          reply_to?: string | null
          status?: string
          subject?: string
          tags?: string[] | null
          text_body?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_workflow_steps: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          step_order: number
          step_type: string
          workflow_id: string
        }
        Insert: {
          config?: Json
          created_at?: string | null
          id?: string
          step_order: number
          step_type: string
          workflow_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          step_order?: number
          step_type?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "email_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      email_workflows: {
        Row: {
          allow_reentry: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          product: string | null
          total_completed: number | null
          total_enrolled: number | null
          trigger_config: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          allow_reentry?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          product?: string | null
          total_completed?: number | null
          total_enrolled?: number | null
          trigger_config?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          allow_reentry?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          product?: string | null
          total_completed?: number | null
          total_enrolled?: number | null
          trigger_config?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      enrichment_logs: {
        Row: {
          agent: string | null
          confidence: string | null
          contact_id: string | null
          created_at: string | null
          field: string
          fontes: Json | null
          id: string
          new_value: string | null
          old_value: string | null
          raciocinio: string | null
        }
        Insert: {
          agent?: string | null
          confidence?: string | null
          contact_id?: string | null
          created_at?: string | null
          field: string
          fontes?: Json | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          raciocinio?: string | null
        }
        Update: {
          agent?: string | null
          confidence?: string | null
          contact_id?: string | null
          created_at?: string | null
          field?: string
          fontes?: Json | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          raciocinio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrichment_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas: {
        Row: {
          created_at: string | null
          data_conclusao: string | null
          descricao: string | null
          id: string
          milestone: string
          pct_completo: number | null
          prazo: string | null
          projeto_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_conclusao?: string | null
          descricao?: string | null
          id?: string
          milestone: string
          pct_completo?: number | null
          prazo?: string | null
          projeto_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_conclusao?: string | null
          descricao?: string | null
          id?: string
          milestone?: string
          pct_completo?: number | null
          prazo?: string | null
          projeto_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entregas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "entregas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      equipe_custo: {
        Row: {
          ativo: boolean
          created_at: string
          custo_mensal: number | null
          horas_semana: number | null
          id: string
          nome: string
          papel: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo_mensal?: number | null
          horas_semana?: number | null
          id?: string
          nome: string
          papel?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo_mensal?: number | null
          horas_semana?: number | null
          id?: string
          nome?: string
          papel?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipe_custo_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipe_custo_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      erros: {
        Row: {
          created_at: string | null
          id: string
          mensagem: string
          origem: string
          payload: Json | null
          projeto_id: string
          resolvido: boolean | null
          resolvido_em: string | null
          resolvido_por: string | null
          severidade: string
          timestamp: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mensagem: string
          origem: string
          payload?: Json | null
          projeto_id: string
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          severidade: string
          timestamp?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mensagem?: string
          origem?: string
          payload?: Json | null
          projeto_id?: string
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          severidade?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "erros_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erros_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erros_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "erros_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          comunidade: string | null
          created_at: string | null
          data: string
          descricao: string | null
          ferramenta: string | null
          ferramenta_descricao: string | null
          horario: string | null
          id: string
          plataforma: string | null
          produto: string | null
          status: string
          stories_teaser: string | null
          tags: string[] | null
          tipo: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          comunidade?: string | null
          created_at?: string | null
          data: string
          descricao?: string | null
          ferramenta?: string | null
          ferramenta_descricao?: string | null
          horario?: string | null
          id?: string
          plataforma?: string | null
          produto?: string | null
          status?: string
          stories_teaser?: string | null
          tags?: string[] | null
          tipo?: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          comunidade?: string | null
          created_at?: string | null
          data?: string
          descricao?: string | null
          ferramenta?: string | null
          ferramenta_descricao?: string | null
          horario?: string | null
          id?: string
          plataforma?: string | null
          produto?: string | null
          status?: string
          stories_teaser?: string | null
          tags?: string[] | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      exercicio_pre_aula: {
        Row: {
          created_at: string | null
          id: string
          tarefas: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          tarefas: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          tarefas?: Json
        }
        Relationships: []
      }
      form_fields: {
        Row: {
          created_at: string | null
          display_order: number
          field_name: string
          field_type: string
          form_id: string
          id: string
          is_hidden: boolean
          label: string
          maps_to: string | null
          options: Json | null
          placeholder: string | null
          required: boolean
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          field_name: string
          field_type?: string
          form_id: string
          id?: string
          is_hidden?: boolean
          label: string
          maps_to?: string | null
          options?: Json | null
          placeholder?: string | null
          required?: boolean
        }
        Update: {
          created_at?: string | null
          display_order?: number
          field_name?: string
          field_type?: string
          form_id?: string
          id?: string
          is_hidden?: boolean
          label?: string
          maps_to?: string | null
          options?: Json | null
          placeholder?: string | null
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_metrics"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          contact_id: string | null
          deal_id: string | null
          fbc: string | null
          fbclid: string | null
          fbp: string | null
          form_id: string
          gclid: string | null
          id: string
          ip_address: string | null
          page_url: string | null
          qualification_result: string | null
          raw_data: Json
          referrer: string | null
          submitted_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          contact_id?: string | null
          deal_id?: string | null
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          form_id: string
          gclid?: string | null
          id?: string
          ip_address?: string | null
          page_url?: string | null
          qualification_result?: string | null
          raw_data?: Json
          referrer?: string | null
          submitted_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          contact_id?: string | null
          deal_id?: string | null
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          form_id?: string
          gclid?: string | null
          id?: string
          ip_address?: string | null
          page_url?: string | null
          qualification_result?: string | null
          raw_data?: Json
          referrer?: string | null
          submitted_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "form_submissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "form_metrics"
            referencedColumns: ["form_id"]
          },
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          notify_emails: string[] | null
          product: string
          redirect_url: string | null
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          notify_emails?: string[] | null
          product?: string
          redirect_url?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notify_emails?: string[] | null
          product?: string
          redirect_url?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      funnel_channels: {
        Row: {
          ano: number
          canal: string
          cpmql_estimado: number | null
          created_at: string | null
          id: string
          mes: number
          orcamento: number
          pipeline_id: string
        }
        Insert: {
          ano: number
          canal: string
          cpmql_estimado?: number | null
          created_at?: string | null
          id?: string
          mes: number
          orcamento?: number
          pipeline_id?: string
        }
        Update: {
          ano?: number
          canal?: string
          cpmql_estimado?: number | null
          created_at?: string | null
          id?: string
          mes?: number
          orcamento?: number
          pipeline_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_channels_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_goals: {
        Row: {
          ano: number
          created_at: string | null
          id: string
          mes: number
          meta_count: number
          meta_revenue: number | null
          pipeline_id: string
          stage_name: string
        }
        Insert: {
          ano: number
          created_at?: string | null
          id?: string
          mes: number
          meta_count?: number
          meta_revenue?: number | null
          pipeline_id: string
          stage_name: string
        }
        Update: {
          ano?: number
          created_at?: string | null
          id?: string
          mes?: number
          meta_count?: number
          meta_revenue?: number | null
          pipeline_id?: string
          stage_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_goals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_macro_goals: {
        Row: {
          ano: number
          id: string
          mes: number
          meta_receita_total: number | null
          orcamento_total: number | null
          pipeline_id: string | null
        }
        Insert: {
          ano: number
          id?: string
          mes: number
          meta_receita_total?: number | null
          orcamento_total?: number | null
          pipeline_id?: string | null
        }
        Update: {
          ano?: number
          id?: string
          mes?: number
          meta_receita_total?: number | null
          orcamento_total?: number | null
          pipeline_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_macro_goals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_notes: {
        Row: {
          ano: number
          created_at: string
          id: string
          mes: number
          nota: string
          pipeline_id: string | null
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          mes: number
          nota?: string
          pipeline_id?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          mes?: number
          nota?: string
          pipeline_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_notes_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      google_sync_state: {
        Row: {
          created_at: string
          id: string
          last_error: string | null
          last_error_at: string | null
          last_page_token: string | null
          last_sync_at: string | null
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_page_token?: string | null
          last_sync_at?: string | null
          scope: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_page_token?: string | null
          last_sync_at?: string | null
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_checks: {
        Row: {
          conteudo_ok: boolean | null
          erro: string | null
          id: string
          projeto_id: string
          response_time_ms: number | null
          status_code: number | null
          timestamp: string
        }
        Insert: {
          conteudo_ok?: boolean | null
          erro?: string | null
          id?: string
          projeto_id: string
          response_time_ms?: number | null
          status_code?: number | null
          timestamp?: string
        }
        Update: {
          conteudo_ok?: boolean | null
          erro?: string | null
          id?: string
          projeto_id?: string
          response_time_ms?: number | null
          status_code?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_checks_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_checks_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_checks_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "health_checks_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_poll_state: {
        Row: {
          automation_id: string
          created_at: string | null
          id: number
          phase: string
          post_id: string
          request_id: number
        }
        Insert: {
          automation_id: string
          created_at?: string | null
          id?: number
          phase?: string
          post_id: string
          request_id: number
        }
        Update: {
          automation_id?: string
          created_at?: string | null
          id?: number
          phase?: string
          post_id?: string
          request_id?: number
        }
        Relationships: []
      }
      instagram_automations: {
        Row: {
          comment_reply: string
          created_at: string | null
          dm_link: string | null
          dm_message: string
          id: string
          is_active: boolean
          keyword: string
          post_id: string | null
          post_url: string
          replies_count: number
          updated_at: string | null
        }
        Insert: {
          comment_reply: string
          created_at?: string | null
          dm_link?: string | null
          dm_message: string
          id?: string
          is_active?: boolean
          keyword?: string
          post_id?: string | null
          post_url: string
          replies_count?: number
          updated_at?: string | null
        }
        Update: {
          comment_reply?: string
          created_at?: string | null
          dm_link?: string | null
          dm_message?: string
          id?: string
          is_active?: boolean
          keyword?: string
          post_id?: string | null
          post_url?: string
          replies_count?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      instagram_comment_logs: {
        Row: {
          automation_id: string
          comment_id: string
          comment_text: string | null
          commenter_ig_id: string | null
          commenter_username: string | null
          contact_id: string | null
          dm_error: string | null
          dm_sent: boolean
          id: string
          replied_at: string | null
        }
        Insert: {
          automation_id: string
          comment_id: string
          comment_text?: string | null
          commenter_ig_id?: string | null
          commenter_username?: string | null
          contact_id?: string | null
          dm_error?: string | null
          dm_sent?: boolean
          id?: string
          replied_at?: string | null
        }
        Update: {
          automation_id?: string
          comment_id?: string
          comment_text?: string | null
          commenter_ig_id?: string | null
          commenter_username?: string | null
          contact_id?: string | null
          dm_error?: string | null
          dm_sent?: boolean
          id?: string
          replied_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_comment_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "instagram_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_comment_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_comment_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
        ]
      }
      intervencoes_gestao: {
        Row: {
          avaliacao_id: string
          created_at: string
          data_intervencao: string | null
          descricao: string
          entrega_titulo: string | null
          id: string
          projeto_nome: string | null
          registrado_por: string | null
        }
        Insert: {
          avaliacao_id: string
          created_at?: string
          data_intervencao?: string | null
          descricao: string
          entrega_titulo?: string | null
          id?: string
          projeto_nome?: string | null
          registrado_por?: string | null
        }
        Update: {
          avaliacao_id?: string
          created_at?: string
          data_intervencao?: string | null
          descricao?: string
          entrega_titulo?: string | null
          id?: string
          projeto_nome?: string | null
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intervencoes_gestao_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes_mensais"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_leads: {
        Row: {
          cargo: string | null
          contact_id: string | null
          created_at: string
          deal_id: string | null
          eh_mql: boolean | null
          email: string
          email_error: string | null
          email_gmail_id: string | null
          email_sent_at: string | null
          email_status: string | null
          faixa_faturamento: string
          gargalo_principal: string
          id: string
          ip_address: string | null
          nome: string
          origem: string | null
          user_agent: string | null
          whatsapp: string
          whatsapp_error: string | null
          whatsapp_sent_at: string | null
          whatsapp_status: string | null
        }
        Insert: {
          cargo?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          eh_mql?: boolean | null
          email: string
          email_error?: string | null
          email_gmail_id?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          faixa_faturamento: string
          gargalo_principal: string
          id?: string
          ip_address?: string | null
          nome: string
          origem?: string | null
          user_agent?: string | null
          whatsapp: string
          whatsapp_error?: string | null
          whatsapp_sent_at?: string | null
          whatsapp_status?: string | null
        }
        Update: {
          cargo?: string | null
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          eh_mql?: boolean | null
          email?: string
          email_error?: string | null
          email_gmail_id?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          faixa_faturamento?: string
          gargalo_principal?: string
          id?: string
          ip_address?: string | null
          nome?: string
          origem?: string | null
          user_agent?: string | null
          whatsapp?: string
          whatsapp_error?: string | null
          whatsapp_sent_at?: string | null
          whatsapp_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kit_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_leads_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_leads_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_leads_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "kit_leads_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
        ]
      }
      launch_campaigns: {
        Row: {
          big_idea: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          inimigo_narrativo: string | null
          metodo: string | null
          nome: string
          oferta: string | null
          status: string
        }
        Insert: {
          big_idea?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          inimigo_narrativo?: string | null
          metodo?: string | null
          nome: string
          oferta?: string | null
          status?: string
        }
        Update: {
          big_idea?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          inimigo_narrativo?: string | null
          metodo?: string | null
          nome?: string
          oferta?: string | null
          status?: string
        }
        Relationships: []
      }
      launch_messages: {
        Row: {
          campaign_id: string
          canal: string
          copy_text: string | null
          created_at: string | null
          data: string | null
          done: boolean | null
          id: string
          phase_id: string | null
          roteiro: string | null
          sort_order: number | null
          story_type: string | null
          subject_line: string | null
          titulo: string
        }
        Insert: {
          campaign_id: string
          canal?: string
          copy_text?: string | null
          created_at?: string | null
          data?: string | null
          done?: boolean | null
          id?: string
          phase_id?: string | null
          roteiro?: string | null
          sort_order?: number | null
          story_type?: string | null
          subject_line?: string | null
          titulo: string
        }
        Update: {
          campaign_id?: string
          canal?: string
          copy_text?: string | null
          created_at?: string | null
          data?: string | null
          done?: boolean | null
          id?: string
          phase_id?: string | null
          roteiro?: string | null
          sort_order?: number | null
          story_type?: string | null
          subject_line?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "launch_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_messages_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "launch_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_phases: {
        Row: {
          campaign_id: string
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          emocao_chave: string | null
          id: string
          nome: string
          objetivo: string | null
          ordem: number | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          emocao_chave?: string | null
          id?: string
          nome: string
          objetivo?: string | null
          ordem?: number | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          emocao_chave?: string | null
          id?: string
          nome?: string
          objetivo?: string | null
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_phases_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "launch_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_cadences: {
        Row: {
          contact_id: string | null
          created_at: string | null
          deal_id: string
          id: string
          message: string
          scheduled_for: string
          sent_at: string | null
          status: string
          step_number: number
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          deal_id: string
          id?: string
          message: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          step_number: number
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string
          id?: string
          message?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_cadences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_cadences_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_cadences_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_cadences_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_cadences_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "lead_cadences_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
        ]
      }
      mads_ad_sets: {
        Row: {
          bid_strategy: string | null
          billing_event: string | null
          campanha_id: string | null
          created_at: string | null
          end_time: string | null
          erro_mensagem: string | null
          id: string
          meta_adset_id: string | null
          nome: string
          optimization_goal: string | null
          orcamento_diario_centavos: number | null
          orcamento_total_centavos: number | null
          payload_envio: Json | null
          promoted_object: Json | null
          publico_descricao: string | null
          resposta_api: Json | null
          start_time: string | null
          status: string | null
          targeting: Json | null
          ultima_sincronizacao_em: string | null
          updated_at: string | null
        }
        Insert: {
          bid_strategy?: string | null
          billing_event?: string | null
          campanha_id?: string | null
          created_at?: string | null
          end_time?: string | null
          erro_mensagem?: string | null
          id?: string
          meta_adset_id?: string | null
          nome: string
          optimization_goal?: string | null
          orcamento_diario_centavos?: number | null
          orcamento_total_centavos?: number | null
          payload_envio?: Json | null
          promoted_object?: Json | null
          publico_descricao?: string | null
          resposta_api?: Json | null
          start_time?: string | null
          status?: string | null
          targeting?: Json | null
          ultima_sincronizacao_em?: string | null
          updated_at?: string | null
        }
        Update: {
          bid_strategy?: string | null
          billing_event?: string | null
          campanha_id?: string | null
          created_at?: string | null
          end_time?: string | null
          erro_mensagem?: string | null
          id?: string
          meta_adset_id?: string | null
          nome?: string
          optimization_goal?: string | null
          orcamento_diario_centavos?: number | null
          orcamento_total_centavos?: number | null
          payload_envio?: Json | null
          promoted_object?: Json | null
          publico_descricao?: string | null
          resposta_api?: Json | null
          start_time?: string | null
          status?: string | null
          targeting?: Json | null
          ultima_sincronizacao_em?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mads_ad_sets_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "mads_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mads_ad_sets_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "mads_v_campaign_performance_30d"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mads_ad_sets_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "mads_v_campaign_performance_multi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mads_ad_sets_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "mads_v_conversao_vs_crm"
            referencedColumns: ["campanha_uuid"]
          },
          {
            foreignKeyName: "mads_ad_sets_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "mads_v_funil_diario"
            referencedColumns: ["campanha_uuid"]
          },
        ]
      }
      mads_ads: {
        Row: {
          ad_set_id: string | null
          created_at: string | null
          creative_id: string | null
          erro_mensagem: string | null
          id: string
          meta_ad_id: string | null
          nome: string
          payload_envio: Json | null
          preview_url: string | null
          resposta_api: Json | null
          status: string | null
          ultima_sincronizacao_em: string | null
          updated_at: string | null
          utm_content_slug: string | null
        }
        Insert: {
          ad_set_id?: string | null
          created_at?: string | null
          creative_id?: string | null
          erro_mensagem?: string | null
          id?: string
          meta_ad_id?: string | null
          nome: string
          payload_envio?: Json | null
          preview_url?: string | null
          resposta_api?: Json | null
          status?: string | null
          ultima_sincronizacao_em?: string | null
          updated_at?: string | null
          utm_content_slug?: string | null
        }
        Update: {
          ad_set_id?: string | null
          created_at?: string | null
          creative_id?: string | null
          erro_mensagem?: string | null
          id?: string
          meta_ad_id?: string | null
          nome?: string
          payload_envio?: Json | null
          preview_url?: string | null
          resposta_api?: Json | null
          status?: string | null
          ultima_sincronizacao_em?: string | null
          updated_at?: string | null
          utm_content_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mads_ads_ad_set_id_fkey"
            columns: ["ad_set_id"]
            isOneToOne: false
            referencedRelation: "mads_ad_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mads_ads_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "mads_creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      mads_audiences: {
        Row: {
          created_at: string | null
          criado_por: string | null
          descricao: string | null
          erro_mensagem: string | null
          filtro_crm: Json | null
          id: string
          meta_ad_account_id: string
          meta_audience_id: string | null
          nome: string
          pais: string | null
          payload_envio: Json | null
          ratio: number | null
          resposta_api: Json | null
          source_audience_id: string | null
          source_meta_audience_id: string | null
          status: string | null
          status_meta: string | null
          tipo: string
          total_usuarios: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criado_por?: string | null
          descricao?: string | null
          erro_mensagem?: string | null
          filtro_crm?: Json | null
          id?: string
          meta_ad_account_id?: string
          meta_audience_id?: string | null
          nome: string
          pais?: string | null
          payload_envio?: Json | null
          ratio?: number | null
          resposta_api?: Json | null
          source_audience_id?: string | null
          source_meta_audience_id?: string | null
          status?: string | null
          status_meta?: string | null
          tipo: string
          total_usuarios?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criado_por?: string | null
          descricao?: string | null
          erro_mensagem?: string | null
          filtro_crm?: Json | null
          id?: string
          meta_ad_account_id?: string
          meta_audience_id?: string | null
          nome?: string
          pais?: string | null
          payload_envio?: Json | null
          ratio?: number | null
          resposta_api?: Json | null
          source_audience_id?: string | null
          source_meta_audience_id?: string | null
          status?: string | null
          status_meta?: string | null
          tipo?: string
          total_usuarios?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mads_audiences_source_audience_id_fkey"
            columns: ["source_audience_id"]
            isOneToOne: false
            referencedRelation: "mads_audiences"
            referencedColumns: ["id"]
          },
        ]
      }
      mads_campaigns: {
        Row: {
          buying_type: string | null
          created_at: string | null
          criado_por: string | null
          erro_mensagem: string | null
          id: string
          lp_destino: string | null
          meta_ad_account_id: string
          meta_campaign_id: string | null
          nome: string
          objetivo: string | null
          orcamento_diario_centavos: number | null
          orcamento_total_centavos: number | null
          pausada_em: string | null
          payload_envio: Json | null
          produto: string | null
          publicada_em: string | null
          resposta_api: Json | null
          special_ad_categories: string[] | null
          status: string | null
          tipo_lead: string | null
          ultima_sincronizacao_em: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          buying_type?: string | null
          created_at?: string | null
          criado_por?: string | null
          erro_mensagem?: string | null
          id?: string
          lp_destino?: string | null
          meta_ad_account_id?: string
          meta_campaign_id?: string | null
          nome: string
          objetivo?: string | null
          orcamento_diario_centavos?: number | null
          orcamento_total_centavos?: number | null
          pausada_em?: string | null
          payload_envio?: Json | null
          produto?: string | null
          publicada_em?: string | null
          resposta_api?: Json | null
          special_ad_categories?: string[] | null
          status?: string | null
          tipo_lead?: string | null
          ultima_sincronizacao_em?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          buying_type?: string | null
          created_at?: string | null
          criado_por?: string | null
          erro_mensagem?: string | null
          id?: string
          lp_destino?: string | null
          meta_ad_account_id?: string
          meta_campaign_id?: string | null
          nome?: string
          objetivo?: string | null
          orcamento_diario_centavos?: number | null
          orcamento_total_centavos?: number | null
          pausada_em?: string | null
          payload_envio?: Json | null
          produto?: string | null
          publicada_em?: string | null
          resposta_api?: Json | null
          special_ad_categories?: string[] | null
          status?: string | null
          tipo_lead?: string | null
          ultima_sincronizacao_em?: string | null
          updated_at?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      mads_creative_swap_20260720: {
        Row: {
          ad_name: string
          ad_uuid: string
          drive_download_request_id: number | null
          feed_hash: string | null
          file_id: string
          file_name: string
          meta_upload_request_id: number | null
          new_ad_id: string | null
          new_creative_id: string | null
          slide_order: number
          story_hash: string | null
        }
        Insert: {
          ad_name: string
          ad_uuid: string
          drive_download_request_id?: number | null
          feed_hash?: string | null
          file_id: string
          file_name: string
          meta_upload_request_id?: number | null
          new_ad_id?: string | null
          new_creative_id?: string | null
          slide_order: number
          story_hash?: string | null
        }
        Update: {
          ad_name?: string
          ad_uuid?: string
          drive_download_request_id?: number | null
          feed_hash?: string | null
          file_id?: string
          file_name?: string
          meta_upload_request_id?: number | null
          new_ad_id?: string | null
          new_creative_id?: string | null
          slide_order?: number
          story_hash?: string | null
        }
        Relationships: []
      }
      mads_creatives: {
        Row: {
          content_item_id: string | null
          created_at: string | null
          cta: string | null
          descricao: string | null
          erro_mensagem: string | null
          formato: string | null
          id: string
          meta_creative_id: string | null
          meta_instagram_actor_id: string | null
          meta_page_id: string
          midias: Json | null
          nome: string
          payload_envio: Json | null
          resposta_api: Json | null
          texto_principal: string | null
          thumbnail_url: string | null
          titulo: string | null
          updated_at: string | null
          url_destino: string | null
          utm_content: string | null
        }
        Insert: {
          content_item_id?: string | null
          created_at?: string | null
          cta?: string | null
          descricao?: string | null
          erro_mensagem?: string | null
          formato?: string | null
          id?: string
          meta_creative_id?: string | null
          meta_instagram_actor_id?: string | null
          meta_page_id?: string
          midias?: Json | null
          nome: string
          payload_envio?: Json | null
          resposta_api?: Json | null
          texto_principal?: string | null
          thumbnail_url?: string | null
          titulo?: string | null
          updated_at?: string | null
          url_destino?: string | null
          utm_content?: string | null
        }
        Update: {
          content_item_id?: string | null
          created_at?: string | null
          cta?: string | null
          descricao?: string | null
          erro_mensagem?: string | null
          formato?: string | null
          id?: string
          meta_creative_id?: string | null
          meta_instagram_actor_id?: string | null
          meta_page_id?: string
          midias?: Json | null
          nome?: string
          payload_envio?: Json | null
          resposta_api?: Json | null
          texto_principal?: string | null
          thumbnail_url?: string | null
          titulo?: string | null
          updated_at?: string | null
          url_destino?: string | null
          utm_content?: string | null
        }
        Relationships: []
      }
      mads_execution_log: {
        Row: {
          acao: string
          created_at: string | null
          duracao_ms: number | null
          entidade_id: string | null
          entidade_tipo: string | null
          erro_mensagem: string | null
          id: string
          iniciado_por: string | null
          meta_endpoint: string | null
          meta_request: Json | null
          meta_response: Json | null
          origem: string | null
          status_code: number | null
          sucesso: boolean | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          duracao_ms?: number | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          erro_mensagem?: string | null
          id?: string
          iniciado_por?: string | null
          meta_endpoint?: string | null
          meta_request?: Json | null
          meta_response?: Json | null
          origem?: string | null
          status_code?: number | null
          sucesso?: boolean | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          duracao_ms?: number | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          erro_mensagem?: string | null
          id?: string
          iniciado_por?: string | null
          meta_endpoint?: string | null
          meta_request?: Json | null
          meta_response?: Json | null
          origem?: string | null
          status_code?: number | null
          sucesso?: boolean | null
        }
        Relationships: []
      }
      mads_insights_daily: {
        Row: {
          ad_id: string | null
          ad_set_id: string | null
          alcance: number | null
          campanha_id: string | null
          cliques: number | null
          cliques_link: number | null
          cpc_brl: number | null
          cpl_brl: number | null
          cpm_brl: number | null
          ctr: number | null
          dia: string
          frequencia: number | null
          gasto_brl: number | null
          id: string
          impressoes: number | null
          leads: number | null
          lp_views: number | null
          raw_actions: Json | null
          raw_cost_per_action: Json | null
          sincronizado_em: string | null
          video_3s_views: number | null
          video_avg_time_watched_sec: number | null
          video_p100_watched: number | null
          video_p25_watched: number | null
          video_p50_watched: number | null
          video_p75_watched: number | null
          video_p95_watched: number | null
          video_plays: number | null
          video_thruplay_views: number | null
        }
        Insert: {
          ad_id?: string | null
          ad_set_id?: string | null
          alcance?: number | null
          campanha_id?: string | null
          cliques?: number | null
          cliques_link?: number | null
          cpc_brl?: number | null
          cpl_brl?: number | null
          cpm_brl?: number | null
          ctr?: number | null
          dia: string
          frequencia?: number | null
          gasto_brl?: number | null
          id?: string
          impressoes?: number | null
          leads?: number | null
          lp_views?: number | null
          raw_actions?: Json | null
          raw_cost_per_action?: Json | null
          sincronizado_em?: string | null
          video_3s_views?: number | null
          video_avg_time_watched_sec?: number | null
          video_p100_watched?: number | null
          video_p25_watched?: number | null
          video_p50_watched?: number | null
          video_p75_watched?: number | null
          video_p95_watched?: number | null
          video_plays?: number | null
          video_thruplay_views?: number | null
        }
        Update: {
          ad_id?: string | null
          ad_set_id?: string | null
          alcance?: number | null
          campanha_id?: string | null
          cliques?: number | null
          cliques_link?: number | null
          cpc_brl?: number | null
          cpl_brl?: number | null
          cpm_brl?: number | null
          ctr?: number | null
          dia?: string
          frequencia?: number | null
          gasto_brl?: number | null
          id?: string
          impressoes?: number | null
          leads?: number | null
          lp_views?: number | null
          raw_actions?: Json | null
          raw_cost_per_action?: Json | null
          sincronizado_em?: string | null
          video_3s_views?: number | null
          video_avg_time_watched_sec?: number | null
          video_p100_watched?: number | null
          video_p25_watched?: number | null
          video_p50_watched?: number | null
          video_p75_watched?: number | null
          video_p95_watched?: number | null
          video_plays?: number | null
          video_thruplay_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mads_insights_daily_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "mads_ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mads_insights_daily_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "mads_v_ads_crm_30d"
            referencedColumns: ["ad_uuid"]
          },
          {
            foreignKeyName: "mads_insights_daily_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "mads_v_criativos_metricas"
            referencedColumns: ["ad_uuid"]
          },
          {
            foreignKeyName: "mads_insights_daily_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "mads_v_top_ads_30d"
            referencedColumns: ["ad_uuid"]
          },
          {
            foreignKeyName: "mads_insights_daily_ad_set_id_fkey"
            columns: ["ad_set_id"]
            isOneToOne: false
            referencedRelation: "mads_ad_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mads_insights_daily_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "mads_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mads_insights_daily_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "mads_v_campaign_performance_30d"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mads_insights_daily_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "mads_v_campaign_performance_multi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mads_insights_daily_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "mads_v_conversao_vs_crm"
            referencedColumns: ["campanha_uuid"]
          },
          {
            foreignKeyName: "mads_insights_daily_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "mads_v_funil_diario"
            referencedColumns: ["campanha_uuid"]
          },
        ]
      }
      mads_lp_credentials: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          nome: string
          provedor: string
          token: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          nome: string
          provedor: string
          token: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          nome?: string
          provedor?: string
          token?: string
        }
        Relationships: []
      }
      mads_lp_health_log: {
        Row: {
          created_at: string | null
          erro: string | null
          form_submit_detectado: boolean | null
          id: string
          lp_id: string | null
          pixel_meta_detectado: boolean | null
          status_http: number | null
          tamanho_html_bytes: number | null
          tempo_ms: number | null
        }
        Insert: {
          created_at?: string | null
          erro?: string | null
          form_submit_detectado?: boolean | null
          id?: string
          lp_id?: string | null
          pixel_meta_detectado?: boolean | null
          status_http?: number | null
          tamanho_html_bytes?: number | null
          tempo_ms?: number | null
        }
        Update: {
          created_at?: string | null
          erro?: string | null
          form_submit_detectado?: boolean | null
          id?: string
          lp_id?: string | null
          pixel_meta_detectado?: boolean | null
          status_http?: number | null
          tamanho_html_bytes?: number | null
          tempo_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mads_lp_health_log_lp_id_fkey"
            columns: ["lp_id"]
            isOneToOne: false
            referencedRelation: "mads_lps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mads_lp_health_log_lp_id_fkey"
            columns: ["lp_id"]
            isOneToOne: false
            referencedRelation: "mads_v_lp_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mads_lp_health_log_lp_id_fkey"
            columns: ["lp_id"]
            isOneToOne: false
            referencedRelation: "mads_v_lp_performance_multi"
            referencedColumns: ["id"]
          },
        ]
      }
      mads_lp_metrics_daily: {
        Row: {
          dead_clicks: number | null
          dia: string
          distinct_users: number | null
          engagement_time_seg: number | null
          excessive_scroll: number | null
          id: string
          lp_id: string | null
          quick_back_clicks: number | null
          rage_clicks: number | null
          raw_clarity_response: Json | null
          script_errors: number | null
          scroll_depth_pct: number | null
          serverside_sessions: number | null
          serverside_users: number | null
          sincronizado_em: string | null
          total_bot_sessions: number | null
          total_sessions: number | null
        }
        Insert: {
          dead_clicks?: number | null
          dia: string
          distinct_users?: number | null
          engagement_time_seg?: number | null
          excessive_scroll?: number | null
          id?: string
          lp_id?: string | null
          quick_back_clicks?: number | null
          rage_clicks?: number | null
          raw_clarity_response?: Json | null
          script_errors?: number | null
          scroll_depth_pct?: number | null
          serverside_sessions?: number | null
          serverside_users?: number | null
          sincronizado_em?: string | null
          total_bot_sessions?: number | null
          total_sessions?: number | null
        }
        Update: {
          dead_clicks?: number | null
          dia?: string
          distinct_users?: number | null
          engagement_time_seg?: number | null
          excessive_scroll?: number | null
          id?: string
          lp_id?: string | null
          quick_back_clicks?: number | null
          rage_clicks?: number | null
          raw_clarity_response?: Json | null
          script_errors?: number | null
          scroll_depth_pct?: number | null
          serverside_sessions?: number | null
          serverside_users?: number | null
          sincronizado_em?: string | null
          total_bot_sessions?: number | null
          total_sessions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mads_lp_metrics_daily_lp_id_fkey"
            columns: ["lp_id"]
            isOneToOne: false
            referencedRelation: "mads_lps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mads_lp_metrics_daily_lp_id_fkey"
            columns: ["lp_id"]
            isOneToOne: false
            referencedRelation: "mads_v_lp_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mads_lp_metrics_daily_lp_id_fkey"
            columns: ["lp_id"]
            isOneToOne: false
            referencedRelation: "mads_v_lp_performance_multi"
            referencedColumns: ["id"]
          },
        ]
      }
      mads_lp_pageviews_raw: {
        Row: {
          country: string | null
          fbclid: string | null
          gclid: string | null
          id: string
          ip_hash: string | null
          origem: string | null
          origem_trafego: string | null
          path: string | null
          referrer: string | null
          screen_height: number | null
          screen_width: number | null
          session_id: string | null
          url: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewport_height: number | null
          viewport_width: number | null
          visitado_em: string
        }
        Insert: {
          country?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip_hash?: string | null
          origem?: string | null
          origem_trafego?: string | null
          path?: string | null
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string | null
          url: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitado_em?: string
        }
        Update: {
          country?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          ip_hash?: string | null
          origem?: string | null
          origem_trafego?: string | null
          path?: string | null
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string | null
          url?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
          visitado_em?: string
        }
        Relationships: []
      }
      mads_lps: {
        Row: {
          ativa: boolean | null
          clarity_credential_id: string | null
          clarity_project_id: string | null
          created_at: string | null
          descricao: string | null
          display_order: number | null
          form_slug: string | null
          id: string
          nome: string
          observacoes: string | null
          pixel_meta_detectado: boolean | null
          produto: string | null
          refeita_em: string | null
          tipo_lead: string | null
          ultimo_check_em: string | null
          ultimo_status_http: number | null
          ultimo_tempo_ms: number | null
          updated_at: string | null
          url: string
          utm_campaign_vinculada: string | null
        }
        Insert: {
          ativa?: boolean | null
          clarity_credential_id?: string | null
          clarity_project_id?: string | null
          created_at?: string | null
          descricao?: string | null
          display_order?: number | null
          form_slug?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          pixel_meta_detectado?: boolean | null
          produto?: string | null
          refeita_em?: string | null
          tipo_lead?: string | null
          ultimo_check_em?: string | null
          ultimo_status_http?: number | null
          ultimo_tempo_ms?: number | null
          updated_at?: string | null
          url: string
          utm_campaign_vinculada?: string | null
        }
        Update: {
          ativa?: boolean | null
          clarity_credential_id?: string | null
          clarity_project_id?: string | null
          created_at?: string | null
          descricao?: string | null
          display_order?: number | null
          form_slug?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          pixel_meta_detectado?: boolean | null
          produto?: string | null
          refeita_em?: string | null
          tipo_lead?: string | null
          ultimo_check_em?: string | null
          ultimo_status_http?: number | null
          ultimo_tempo_ms?: number | null
          updated_at?: string | null
          url?: string
          utm_campaign_vinculada?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_clarity_cred"
            columns: ["clarity_credential_id"]
            isOneToOne: false
            referencedRelation: "mads_lp_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_capi_events: {
        Row: {
          attempt_count: number | null
          contact_id: string | null
          created_at: string | null
          deal_id: string | null
          event_id: string
          event_name: string
          event_time: number
          historical_match: boolean | null
          id: string
          last_error: string | null
          meta_response: Json | null
          payload: Json | null
          pipeline_name: string | null
          pixel_id: string
          sent_at: string | null
          status: string
          test_event_code: string | null
          updated_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          event_id: string
          event_name: string
          event_time: number
          historical_match?: boolean | null
          id?: string
          last_error?: string | null
          meta_response?: Json | null
          payload?: Json | null
          pipeline_name?: string | null
          pixel_id: string
          sent_at?: string | null
          status?: string
          test_event_code?: string | null
          updated_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          event_id?: string
          event_name?: string
          event_time?: number
          historical_match?: boolean | null
          id?: string
          last_error?: string | null
          meta_response?: Json | null
          payload?: Json | null
          pipeline_name?: string | null
          pixel_id?: string
          sent_at?: string | null
          status?: string
          test_event_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_capi_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_capi_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_capi_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_capi_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_capi_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "meta_capi_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
        ]
      }
      meta_templates: {
        Row: {
          body_text: string | null
          button_payload: string | null
          button_text: string | null
          button_type: string | null
          button_url: string | null
          category: string | null
          created_at: string
          group_key: string | null
          id: string
          language: string
          last_synced_at: string | null
          meta_status: string | null
          meta_template_name: string
          name: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body_text?: string | null
          button_payload?: string | null
          button_text?: string | null
          button_type?: string | null
          button_url?: string | null
          category?: string | null
          created_at?: string
          group_key?: string | null
          id?: string
          language?: string
          last_synced_at?: string | null
          meta_status?: string | null
          meta_template_name: string
          name?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body_text?: string | null
          button_payload?: string | null
          button_text?: string | null
          button_type?: string | null
          button_url?: string | null
          category?: string | null
          created_at?: string
          group_key?: string | null
          id?: string
          language?: string
          last_synced_at?: string | null
          meta_status?: string | null
          meta_template_name?: string
          name?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      metas: {
        Row: {
          ano: number
          categoria: string
          created_at: string | null
          id: string
          mes: number
          valor_projetado: number
        }
        Insert: {
          ano: number
          categoria: string
          created_at?: string | null
          id?: string
          mes: number
          valor_projetado?: number
        }
        Update: {
          ano?: number
          categoria?: string
          created_at?: string | null
          id?: string
          mes?: number
          valor_projetado?: number
        }
        Relationships: []
      }
      metricas_diarias: {
        Row: {
          commits: number | null
          created_at: string | null
          data: string
          deploys_falha: number | null
          deploys_sucesso: number | null
          id: string
          issues_abertas: number | null
          issues_fechadas: number | null
          projeto_id: string
          prs_abertos: number | null
          prs_merged: number | null
          response_time_avg_ms: number | null
          uptime_pct: number | null
        }
        Insert: {
          commits?: number | null
          created_at?: string | null
          data: string
          deploys_falha?: number | null
          deploys_sucesso?: number | null
          id?: string
          issues_abertas?: number | null
          issues_fechadas?: number | null
          projeto_id: string
          prs_abertos?: number | null
          prs_merged?: number | null
          response_time_avg_ms?: number | null
          uptime_pct?: number | null
        }
        Update: {
          commits?: number | null
          created_at?: string | null
          data?: string
          deploys_falha?: number | null
          deploys_sucesso?: number | null
          id?: string
          issues_abertas?: number | null
          issues_fechadas?: number | null
          projeto_id?: string
          prs_abertos?: number | null
          prs_merged?: number | null
          response_time_avg_ms?: number | null
          uptime_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metricas_diarias_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metricas_diarias_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "metricas_diarias_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "metricas_diarias_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      nfeio_emissions: {
        Row: {
          created_at: string
          emitido_em: string | null
          enviado_email: boolean
          enviado_whatsapp: boolean
          erro_msg: string | null
          id: string
          nfeio_id: string | null
          numero_nf: string | null
          pdf_url: string | null
          serie: string | null
          status: string
          valor: number | null
          venda_id: string
          xml_url: string | null
        }
        Insert: {
          created_at?: string
          emitido_em?: string | null
          enviado_email?: boolean
          enviado_whatsapp?: boolean
          erro_msg?: string | null
          id?: string
          nfeio_id?: string | null
          numero_nf?: string | null
          pdf_url?: string | null
          serie?: string | null
          status?: string
          valor?: number | null
          venda_id: string
          xml_url?: string | null
        }
        Update: {
          created_at?: string
          emitido_em?: string | null
          enviado_email?: boolean
          enviado_whatsapp?: boolean
          erro_msg?: string | null
          id?: string
          nfeio_id?: string | null
          numero_nf?: string | null
          pdf_url?: string | null
          serie?: string | null
          status?: string
          valor?: number | null
          venda_id?: string
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfeio_emissions_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          cep: string | null
          cpf_cnpj: string | null
          created_at: string | null
          data_emissao: string | null
          data_envio: string | null
          descricao_servico: string | null
          endereco: string | null
          id: string
          mes_referencia: string | null
          numero_nf: number | null
          razao_social: string | null
          status_nf: string
          valor: number
          venda_id: string | null
        }
        Insert: {
          cep?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_emissao?: string | null
          data_envio?: string | null
          descricao_servico?: string | null
          endereco?: string | null
          id?: string
          mes_referencia?: string | null
          numero_nf?: number | null
          razao_social?: string | null
          status_nf?: string
          valor?: number
          venda_id?: string | null
        }
        Update: {
          cep?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_emissao?: string | null
          data_envio?: string | null
          descricao_servico?: string | null
          endereco?: string | null
          id?: string
          mes_referencia?: string | null
          numero_nf?: number | null
          razao_social?: string | null
          status_nf?: string
          valor?: number
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          projeto_id: string | null
          related_client: string | null
          related_contact_id: string | null
          related_deal_id: string | null
          related_produto: string | null
          review_id: string | null
          source_key: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          projeto_id?: string | null
          related_client?: string | null
          related_contact_id?: string | null
          related_deal_id?: string | null
          related_produto?: string | null
          review_id?: string | null
          source_key?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          projeto_id?: string | null
          related_client?: string | null
          related_contact_id?: string | null
          related_deal_id?: string | null
          related_produto?: string | null
          review_id?: string | null
          source_key?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "notifications_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_contact_id_fkey"
            columns: ["related_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_contact_id_fkey"
            columns: ["related_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_deal_id_fkey"
            columns: ["related_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_deal_id_fkey"
            columns: ["related_deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_deal_id_fkey"
            columns: ["related_deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "notifications_related_deal_id_fkey"
            columns: ["related_deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "notifications_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "cockpit_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      notion_projects: {
        Row: {
          cliente: string | null
          encontros: string | null
          entrega_prevista: string | null
          is_subitem: boolean
          mercado: string | null
          nome_projeto: string
          notas: string | null
          notion_id: string
          owner_name: string | null
          pendencias: boolean | null
          portal_url: string | null
          produto: string | null
          segmento: string | null
          status: string | null
          synced_at: string
          ultima_atualizacao: string | null
          ultimo_encontro: string | null
        }
        Insert: {
          cliente?: string | null
          encontros?: string | null
          entrega_prevista?: string | null
          is_subitem?: boolean
          mercado?: string | null
          nome_projeto: string
          notas?: string | null
          notion_id: string
          owner_name?: string | null
          pendencias?: boolean | null
          portal_url?: string | null
          produto?: string | null
          segmento?: string | null
          status?: string | null
          synced_at?: string
          ultima_atualizacao?: string | null
          ultimo_encontro?: string | null
        }
        Update: {
          cliente?: string | null
          encontros?: string | null
          entrega_prevista?: string | null
          is_subitem?: boolean
          mercado?: string | null
          nome_projeto?: string
          notas?: string | null
          notion_id?: string
          owner_name?: string | null
          pendencias?: boolean | null
          portal_url?: string | null
          produto?: string | null
          segmento?: string | null
          status?: string | null
          synced_at?: string
          ultima_atualizacao?: string | null
          ultimo_encontro?: string | null
        }
        Relationships: []
      }
      nubank_webhooks: {
        Row: {
          bank_transaction_id: string | null
          created_at: string
          erro: string | null
          evento: string | null
          id: string
          payload: Json
          processado: boolean
        }
        Insert: {
          bank_transaction_id?: string | null
          created_at?: string
          erro?: string | null
          evento?: string | null
          id?: string
          payload: Json
          processado?: boolean
        }
        Update: {
          bank_transaction_id?: string | null
          created_at?: string
          erro?: string | null
          evento?: string | null
          id?: string
          payload?: Json
          processado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "nubank_webhooks_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nubank_webhooks_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_conciliacao"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas: {
        Row: {
          cobranca_tentativas: number
          cobranca_triagem_manual: boolean
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string
          id: string
          lia_bill_id: string | null
          numero: number
          status: string
          tipo: string
          ultima_cobranca_em: string | null
          valor: number
          venda_id: string
        }
        Insert: {
          cobranca_tentativas?: number
          cobranca_triagem_manual?: boolean
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          id?: string
          lia_bill_id?: string | null
          numero?: number
          status?: string
          tipo?: string
          ultima_cobranca_em?: string | null
          valor?: number
          venda_id: string
        }
        Update: {
          cobranca_tentativas?: number
          cobranca_triagem_manual?: boolean
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          id?: string
          lia_bill_id?: string | null
          numero?: number
          status?: string
          tipo?: string
          ultima_cobranca_em?: string | null
          valor?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string | null
          id: string
          name: string
          product: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          product?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          product?: string
        }
        Relationships: []
      }
      plano_mensal: {
        Row: {
          ano: number
          ganhos: number
          investimento: number
          mes: number
          mqls: number
          receita: number
          rrs: number
          updated_at: string
        }
        Insert: {
          ano: number
          ganhos?: number
          investimento?: number
          mes: number
          mqls?: number
          receita?: number
          rrs?: number
          updated_at?: string
        }
        Update: {
          ano?: number
          ganhos?: number
          investimento?: number
          mes?: number
          mqls?: number
          receita?: number
          rrs?: number
          updated_at?: string
        }
        Relationships: []
      }
      plano_mensal_academy: {
        Row: {
          ano: number
          conectados: number | null
          created_at: string | null
          ganhos: number | null
          id: string
          mes: number
          mqls: number | null
          receita: number | null
        }
        Insert: {
          ano: number
          conectados?: number | null
          created_at?: string | null
          ganhos?: number | null
          id?: string
          mes: number
          mqls?: number | null
          receita?: number | null
        }
        Update: {
          ano?: number
          conectados?: number | null
          created_at?: string | null
          ganhos?: number | null
          id?: string
          mes?: number
          mqls?: number | null
          receita?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cloudtalk_agent_id: string | null
          created_at: string | null
          display_role: string | null
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          cloudtalk_agent_id?: string | null
          created_at?: string | null
          display_role?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          cloudtalk_agent_id?: string | null
          created_at?: string | null
          display_role?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_documents: {
        Row: {
          created_at: string | null
          file_size_bytes: number | null
          file_type: string | null
          file_url: string
          id: string
          name: string
          project_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          project_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          project_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          author: string | null
          content: string
          created_at: string | null
          id: string
          note_type: string | null
          project_id: string
        }
        Insert: {
          author?: string | null
          content: string
          created_at?: string | null
          id?: string
          note_type?: string | null
          project_id: string
        }
        Update: {
          author?: string | null
          content?: string
          created_at?: string | null
          id?: string
          note_type?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_default: boolean | null
          name: string
          parent_task_id: string | null
          priority: string
          project_id: string
          send_to_client: boolean
          sent_to_client_at: string | null
          sort_order: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          parent_task_id?: string | null
          priority?: string
          project_id: string
          send_to_client?: boolean
          sent_to_client_at?: string | null
          sort_order?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          parent_task_id?: string | null
          priority?: string
          project_id?: string
          send_to_client?: boolean
          sent_to_client_at?: string | null
          sort_order?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          created_at: string | null
          data_inicio: string | null
          data_previsao_fim: string | null
          deal_id: string | null
          description: string | null
          escopo_resumo: string | null
          id: string
          name: string
          produto_venda: string | null
          status: string
          tipo_contrato: string | null
          updated_at: string | null
          valor_contrato: number | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          data_inicio?: string | null
          data_previsao_fim?: string | null
          deal_id?: string | null
          description?: string | null
          escopo_resumo?: string | null
          id?: string
          name: string
          produto_venda?: string | null
          status?: string
          tipo_contrato?: string | null
          updated_at?: string | null
          valor_contrato?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          data_inicio?: string | null
          data_previsao_fim?: string | null
          deal_id?: string | null
          description?: string | null
          escopo_resumo?: string | null
          id?: string
          name?: string
          produto_venda?: string | null
          status?: string
          tipo_contrato?: string | null
          updated_at?: string | null
          valor_contrato?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "projects_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
        ]
      }
      projeto_checklist: {
        Row: {
          created_at: string | null
          done: boolean
          done_em: string | null
          etapa: string
          id: string
          item: string
          ordem: number | null
          projeto_id: string
          responsavel: string | null
        }
        Insert: {
          created_at?: string | null
          done?: boolean
          done_em?: string | null
          etapa: string
          id?: string
          item: string
          ordem?: number | null
          projeto_id: string
          responsavel?: string | null
        }
        Update: {
          created_at?: string | null
          done?: boolean
          done_em?: string | null
          etapa?: string
          id?: string
          item?: string
          ordem?: number | null
          projeto_id?: string
          responsavel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projeto_checklist_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_checklist_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_checklist_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "projeto_checklist_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_documentos: {
        Row: {
          arquivo_nome: string | null
          arquivo_path: string | null
          arquivo_size: number | null
          created_at: string | null
          etapa: string | null
          id: string
          link: string | null
          nome: string
          obrigatorio: boolean
          ordem: number | null
          projeto_id: string
          status: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          arquivo_size?: number | null
          created_at?: string | null
          etapa?: string | null
          id?: string
          link?: string | null
          nome: string
          obrigatorio?: boolean
          ordem?: number | null
          projeto_id: string
          status?: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_path?: string | null
          arquivo_size?: number | null
          created_at?: string | null
          etapa?: string | null
          id?: string
          link?: string | null
          nome?: string
          obrigatorio?: boolean
          ordem?: number | null
          projeto_id?: string
          status?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projeto_documentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_documentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_documentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "projeto_documentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_fase_template: {
        Row: {
          created_at: string
          fase: string
          id: string
          item: string
          obrigatorio: boolean
          ordem: number
        }
        Insert: {
          created_at?: string
          fase: string
          id?: string
          item: string
          obrigatorio?: boolean
          ordem?: number
        }
        Update: {
          created_at?: string
          fase?: string
          id?: string
          item?: string
          obrigatorio?: boolean
          ordem?: number
        }
        Relationships: []
      }
      projeto_impedimentos: {
        Row: {
          created_at: string
          duracao_horas: number | null
          fim: string | null
          id: string
          inicio: string
          projeto_id: string
          registrado_por: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          duracao_horas?: number | null
          fim?: string | null
          id?: string
          inicio?: string
          projeto_id: string
          registrado_por?: string | null
          tipo: string
        }
        Update: {
          created_at?: string
          duracao_horas?: number | null
          fim?: string | null
          id?: string
          inicio?: string
          projeto_id?: string
          registrado_por?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_impedimentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_impedimentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_impedimentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "projeto_impedimentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_responsaveis: {
        Row: {
          contato: string | null
          created_at: string | null
          id: string
          nome: string
          papel: string
          projeto_id: string
          user_id: string | null
        }
        Insert: {
          contato?: string | null
          created_at?: string | null
          id?: string
          nome: string
          papel: string
          projeto_id: string
          user_id?: string | null
        }
        Update: {
          contato?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          papel?: string
          projeto_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projeto_responsaveis_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_responsaveis_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_responsaveis_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "projeto_responsaveis_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          acesso_email: string | null
          acesso_senha: string | null
          admin_only: boolean
          atualizado_em: string | null
          atualizado_por: string | null
          cliente_id: string
          code_alerts_abertos: number | null
          complexidade: string | null
          conteudo_esperado_health: string | null
          created_at: string | null
          crm_project_id: string | null
          data_entrega_prevista: string | null
          data_entrega_real: string | null
          data_inicio: string | null
          db_atualizado_em: string | null
          db_edge_functions: Json | null
          db_riscos: Json | null
          db_secrets_count: number | null
          db_size_bytes: number | null
          db_tabelas: number | null
          db_tabelas_detalhes: Json | null
          db_tabelas_sem_rls: number | null
          dependabot_abertos: number | null
          etapa: string | null
          github_branch: string | null
          github_repo: string | null
          id: string
          impedimento_desde: string | null
          impedimento_tipo: string | null
          is_aditivo: boolean
          links: Json
          nome: string
          observacoes: string | null
          prioridade: string | null
          secret_alerts_abertos: number | null
          segmento: string | null
          seguranca_atualizada_em: string | null
          stack_tipo: string | null
          status_andamento: string | null
          status_geral: string | null
          supabase_project_ref: string | null
          supabase_status: string | null
          tem_business_care: boolean
          tem_manutencao: boolean
          ultimo_deploy_em: string | null
          ultimo_deploy_status: string | null
          updated_at: string | null
          url_producao: string | null
          vercel_project_id: string | null
          visivel: boolean
        }
        Insert: {
          acesso_email?: string | null
          acesso_senha?: string | null
          admin_only?: boolean
          atualizado_em?: string | null
          atualizado_por?: string | null
          cliente_id: string
          code_alerts_abertos?: number | null
          complexidade?: string | null
          conteudo_esperado_health?: string | null
          created_at?: string | null
          crm_project_id?: string | null
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          data_inicio?: string | null
          db_atualizado_em?: string | null
          db_edge_functions?: Json | null
          db_riscos?: Json | null
          db_secrets_count?: number | null
          db_size_bytes?: number | null
          db_tabelas?: number | null
          db_tabelas_detalhes?: Json | null
          db_tabelas_sem_rls?: number | null
          dependabot_abertos?: number | null
          etapa?: string | null
          github_branch?: string | null
          github_repo?: string | null
          id?: string
          impedimento_desde?: string | null
          impedimento_tipo?: string | null
          is_aditivo?: boolean
          links?: Json
          nome: string
          observacoes?: string | null
          prioridade?: string | null
          secret_alerts_abertos?: number | null
          segmento?: string | null
          seguranca_atualizada_em?: string | null
          stack_tipo?: string | null
          status_andamento?: string | null
          status_geral?: string | null
          supabase_project_ref?: string | null
          supabase_status?: string | null
          tem_business_care?: boolean
          tem_manutencao?: boolean
          ultimo_deploy_em?: string | null
          ultimo_deploy_status?: string | null
          updated_at?: string | null
          url_producao?: string | null
          vercel_project_id?: string | null
          visivel?: boolean
        }
        Update: {
          acesso_email?: string | null
          acesso_senha?: string | null
          admin_only?: boolean
          atualizado_em?: string | null
          atualizado_por?: string | null
          cliente_id?: string
          code_alerts_abertos?: number | null
          complexidade?: string | null
          conteudo_esperado_health?: string | null
          created_at?: string | null
          crm_project_id?: string | null
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          data_inicio?: string | null
          db_atualizado_em?: string | null
          db_edge_functions?: Json | null
          db_riscos?: Json | null
          db_secrets_count?: number | null
          db_size_bytes?: number | null
          db_tabelas?: number | null
          db_tabelas_detalhes?: Json | null
          db_tabelas_sem_rls?: number | null
          dependabot_abertos?: number | null
          etapa?: string | null
          github_branch?: string | null
          github_repo?: string | null
          id?: string
          impedimento_desde?: string | null
          impedimento_tipo?: string | null
          is_aditivo?: boolean
          links?: Json
          nome?: string
          observacoes?: string | null
          prioridade?: string | null
          secret_alerts_abertos?: number | null
          segmento?: string | null
          seguranca_atualizada_em?: string | null
          stack_tipo?: string | null
          status_andamento?: string | null
          status_geral?: string | null
          supabase_project_ref?: string | null
          supabase_status?: string | null
          tem_business_care?: boolean
          tem_manutencao?: boolean
          ultimo_deploy_em?: string | null
          ultimo_deploy_status?: string | null
          updated_at?: string | null
          url_producao?: string | null
          vercel_project_id?: string | null
          visivel?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "projetos_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "team_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          notify_commercial_deadline: boolean
          notify_handoff_urgent: boolean
          notify_new_client_message: boolean
          notify_new_inbound: boolean
          notify_new_message: boolean
          notify_project_deadline: boolean
          notify_sql_new: boolean
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          notify_commercial_deadline?: boolean
          notify_handoff_urgent?: boolean
          notify_new_client_message?: boolean
          notify_new_inbound?: boolean
          notify_new_message?: boolean
          notify_project_deadline?: boolean
          notify_sql_new?: boolean
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          notify_commercial_deadline?: boolean
          notify_handoff_urgent?: boolean
          notify_new_client_message?: boolean
          notify_new_inbound?: boolean
          notify_new_message?: boolean
          notify_project_deadline?: boolean
          notify_sql_new?: boolean
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      receita_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          metric: string | null
          priority: string | null
          product: string | null
          source_context: string | null
          status: string
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metric?: string | null
          priority?: string | null
          product?: string | null
          source_context?: string | null
          status?: string
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metric?: string | null
          priority?: string | null
          product?: string | null
          source_context?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      reminder_templates: {
        Row: {
          day_offset: number
          description: string | null
          id: string
          recurrence: string | null
          reminder_type: string
          service_type: string
          sort_order: number | null
          title: string
        }
        Insert: {
          day_offset?: number
          description?: string | null
          id?: string
          recurrence?: string | null
          reminder_type?: string
          service_type: string
          sort_order?: number | null
          title: string
        }
        Update: {
          day_offset?: number
          description?: string | null
          id?: string
          recurrence?: string | null
          reminder_type?: string
          service_type?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: []
      }
      repasses: {
        Row: {
          created_at: string | null
          data_pagamento: string | null
          id: string
          indicador_nome: string
          status: string
          valor: number
          venda_id: string
        }
        Insert: {
          created_at?: string | null
          data_pagamento?: string | null
          id?: string
          indicador_nome: string
          status?: string
          valor?: number
          venda_id: string
        }
        Update: {
          created_at?: string | null
          data_pagamento?: string | null
          id?: string
          indicador_nome?: string
          status?: string
          valor?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repasses_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_messages: {
        Row: {
          canal: string
          comunidade: string
          copy_text: string | null
          created_at: string | null
          data: string
          event_id: string | null
          horario: string | null
          id: string
          roteiro: string | null
          status: string
          story_type: string | null
          titulo: string
        }
        Insert: {
          canal?: string
          comunidade?: string
          copy_text?: string | null
          created_at?: string | null
          data: string
          event_id?: string | null
          horario?: string | null
          id?: string
          roteiro?: string | null
          status?: string
          story_type?: string | null
          titulo: string
        }
        Update: {
          canal?: string
          comunidade?: string
          copy_text?: string | null
          created_at?: string | null
          data?: string
          event_id?: string | null
          horario?: string | null
          id?: string
          roteiro?: string | null
          status?: string
          story_type?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          acao: string
          actor_email: string | null
          actor_id: string | null
          alvo_id: string | null
          antes: Json | null
          db_role: string | null
          depois: Json | null
          id: number
          ocorrido_em: string
          tabela: string
        }
        Insert: {
          acao: string
          actor_email?: string | null
          actor_id?: string | null
          alvo_id?: string | null
          antes?: Json | null
          db_role?: string | null
          depois?: Json | null
          id?: never
          ocorrido_em?: string
          tabela: string
        }
        Update: {
          acao?: string
          actor_email?: string | null
          actor_id?: string | null
          alvo_id?: string | null
          antes?: Json | null
          db_role?: string | null
          depois?: Json | null
          id?: never
          ocorrido_em?: string
          tabela?: string
        }
        Relationships: []
      }
      signup_allowlist: {
        Row: {
          added_at: string
          added_by: string | null
          email: string
          note: string | null
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          email: string
          note?: string | null
        }
        Update: {
          added_at?: string
          added_by?: string | null
          email?: string
          note?: string | null
        }
        Relationships: []
      }
      sprint_tarefas: {
        Row: {
          created_at: string | null
          deadline_overdue_sent_at: string | null
          deadline_warning_sent_at: string | null
          descricao: string | null
          feita_em: string | null
          ia_alerta: string | null
          id: string
          ordem: number | null
          origem: string
          parent_tarefa_id: string | null
          prazo: string | null
          prioridade: string | null
          projeto_id: string
          responsaveis: string[]
          responsavel: string | null
          reuniao_activity_id: string | null
          sprint_id: string
          status: string
          titulo: string
        }
        Insert: {
          created_at?: string | null
          deadline_overdue_sent_at?: string | null
          deadline_warning_sent_at?: string | null
          descricao?: string | null
          feita_em?: string | null
          ia_alerta?: string | null
          id?: string
          ordem?: number | null
          origem?: string
          parent_tarefa_id?: string | null
          prazo?: string | null
          prioridade?: string | null
          projeto_id: string
          responsaveis?: string[]
          responsavel?: string | null
          reuniao_activity_id?: string | null
          sprint_id: string
          status?: string
          titulo: string
        }
        Update: {
          created_at?: string | null
          deadline_overdue_sent_at?: string | null
          deadline_warning_sent_at?: string | null
          descricao?: string | null
          feita_em?: string | null
          ia_alerta?: string | null
          id?: string
          ordem?: number | null
          origem?: string
          parent_tarefa_id?: string | null
          prazo?: string | null
          prioridade?: string | null
          projeto_id?: string
          responsaveis?: string[]
          responsavel?: string | null
          reuniao_activity_id?: string | null
          sprint_id?: string
          status?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_tarefas_parent_tarefa_id_fkey"
            columns: ["parent_tarefa_id"]
            isOneToOne: false
            referencedRelation: "sprint_tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_tarefas_parent_tarefa_id_fkey"
            columns: ["parent_tarefa_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["tarefa_id"]
          },
          {
            foreignKeyName: "sprint_tarefas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_tarefas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_tarefas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "sprint_tarefas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_tarefas_reuniao_activity_id_fkey"
            columns: ["reuniao_activity_id"]
            isOneToOne: false
            referencedRelation: "deal_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_tarefas_reuniao_activity_id_fkey"
            columns: ["reuniao_activity_id"]
            isOneToOne: false
            referencedRelation: "v_followup_reunioes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_tarefas_reuniao_activity_id_fkey"
            columns: ["reuniao_activity_id"]
            isOneToOne: false
            referencedRelation: "v_reunioes_agenda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_tarefas_reuniao_activity_id_fkey"
            columns: ["reuniao_activity_id"]
            isOneToOne: false
            referencedRelation: "v_scrum_reunioes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_tarefas_reuniao_activity_id_fkey"
            columns: ["reuniao_activity_id"]
            isOneToOne: false
            referencedRelation: "v_team_calendar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_tarefas_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_tarefas_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["sprint_id"]
          },
        ]
      }
      sprints: {
        Row: {
          arquitetura: string | null
          avaliacao: string | null
          ciclo_id: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          desenvolvedor: string | null
          duracao_semanas: number | null
          encerrada_em: string | null
          escopo: string | null
          id: string
          is_backlog: boolean
          meta: string | null
          nome: string
          project_priorities_by_dev: Json
          projeto_id: string | null
          status: string
          tipo_sistema: string | null
        }
        Insert: {
          arquitetura?: string | null
          avaliacao?: string | null
          ciclo_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          desenvolvedor?: string | null
          duracao_semanas?: number | null
          encerrada_em?: string | null
          escopo?: string | null
          id?: string
          is_backlog?: boolean
          meta?: string | null
          nome: string
          project_priorities_by_dev?: Json
          projeto_id?: string | null
          status?: string
          tipo_sistema?: string | null
        }
        Update: {
          arquitetura?: string | null
          avaliacao?: string | null
          ciclo_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          desenvolvedor?: string | null
          duracao_semanas?: number | null
          encerrada_em?: string | null
          escopo?: string | null
          id?: string
          is_backlog?: boolean
          meta?: string | null
          nome?: string
          project_priorities_by_dev?: Json
          projeto_id?: string | null
          status?: string
          tipo_sistema?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprints_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprints_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprints_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprints_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["projeto_id"]
          },
          {
            foreignKeyName: "sprints_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_timeline_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          created_at: string | null
          display_order: number
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
          pipeline_id: string
          probability: number
        }
        Insert: {
          created_at?: string | null
          display_order: number
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
          pipeline_id: string
          probability?: number
        }
        Update: {
          created_at?: string | null
          display_order?: number
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
          pipeline_id?: string
          probability?: number
        }
        Relationships: [
          {
            foreignKeyName: "stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      stale_alert_configs: {
        Row: {
          id: string
          is_active: boolean
          pipeline_id: string
          stage_id: string
          threshold_days: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          pipeline_id: string
          stage_id: string
          threshold_days?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          pipeline_id?: string
          stage_id?: string
          threshold_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "stale_alert_configs_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stale_alert_configs_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      static_content_items: {
        Row: {
          anexos_links: string | null
          categoria_conteudo: string | null
          cpc: number | null
          created_at: string | null
          ctr: number | null
          data_publicacao: string | null
          data_publicacao_programada: string | null
          deadline: string | null
          descricao: string | null
          formato: string | null
          id: string
          impressoes: number | null
          investimento: number | null
          legenda: string | null
          link_arquivo: string | null
          link_referencia: string | null
          plataformas: string[] | null
          prioridade: string | null
          produto: string | null
          recomendacoes: string | null
          status: string | null
          tipo: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          anexos_links?: string | null
          categoria_conteudo?: string | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          data_publicacao?: string | null
          data_publicacao_programada?: string | null
          deadline?: string | null
          descricao?: string | null
          formato?: string | null
          id?: string
          impressoes?: number | null
          investimento?: number | null
          legenda?: string | null
          link_arquivo?: string | null
          link_referencia?: string | null
          plataformas?: string[] | null
          prioridade?: string | null
          produto?: string | null
          recomendacoes?: string | null
          status?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          anexos_links?: string | null
          categoria_conteudo?: string | null
          cpc?: number | null
          created_at?: string | null
          ctr?: number | null
          data_publicacao?: string | null
          data_publicacao_programada?: string | null
          deadline?: string | null
          descricao?: string | null
          formato?: string | null
          id?: string
          impressoes?: number | null
          investimento?: number | null
          legenda?: string | null
          link_arquivo?: string | null
          link_referencia?: string | null
          plataformas?: string[] | null
          prioridade?: string | null
          produto?: string | null
          recomendacoes?: string | null
          status?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tarefa_anexos: {
        Row: {
          arquivo_nome: string
          arquivo_path: string
          arquivo_size: number
          created_at: string
          id: string
          tabela: string
          tarefa_id: string
          uploaded_by: string | null
        }
        Insert: {
          arquivo_nome: string
          arquivo_path: string
          arquivo_size?: number
          created_at?: string
          id?: string
          tabela?: string
          tarefa_id: string
          uploaded_by?: string | null
        }
        Update: {
          arquivo_nome?: string
          arquivo_path?: string
          arquivo_size?: number
          created_at?: string
          id?: string
          tabela?: string
          tarefa_id?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      tasks_ciclos: {
        Row: {
          ano: number | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          id: string
          mes: number | null
          meta: string | null
          nome: string
          status: string
        }
        Insert: {
          ano?: number | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          mes?: number | null
          meta?: string | null
          nome: string
          status?: string
        }
        Update: {
          ano?: number | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          mes?: number | null
          meta?: string | null
          nome?: string
          status?: string
        }
        Relationships: []
      }
      tasks_dailies: {
        Row: {
          autor: string
          bloqueios: string | null
          created_at: string
          data: string
          fez: string | null
          id: string
          nao_fez: string | null
          projeto_id: string | null
          saude: string | null
          sprint_id: string | null
        }
        Insert: {
          autor: string
          bloqueios?: string | null
          created_at?: string
          data?: string
          fez?: string | null
          id?: string
          nao_fez?: string | null
          projeto_id?: string | null
          saude?: string | null
          sprint_id?: string | null
        }
        Update: {
          autor?: string
          bloqueios?: string | null
          created_at?: string
          data?: string
          fez?: string | null
          id?: string
          nao_fez?: string | null
          projeto_id?: string | null
          saude?: string | null
          sprint_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_dailies_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "tasks_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_dailies_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_tasks_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_dailies_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "tasks_sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks_projetos: {
        Row: {
          admin_only: boolean
          atualizado_em: string | null
          atualizado_por: string | null
          cliente_id: string | null
          created_at: string
          data_entrega_prevista: string | null
          data_entrega_real: string | null
          data_inicio: string | null
          etapa: string | null
          id: string
          nome: string
          observacoes: string | null
          prioridade: string | null
          segmento: string | null
          status_geral: string | null
          updated_at: string
          visivel: boolean
        }
        Insert: {
          admin_only?: boolean
          atualizado_em?: string | null
          atualizado_por?: string | null
          cliente_id?: string | null
          created_at?: string
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          data_inicio?: string | null
          etapa?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          prioridade?: string | null
          segmento?: string | null
          status_geral?: string | null
          updated_at?: string
          visivel?: boolean
        }
        Update: {
          admin_only?: boolean
          atualizado_em?: string | null
          atualizado_por?: string | null
          cliente_id?: string | null
          created_at?: string
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          data_inicio?: string | null
          etapa?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          prioridade?: string | null
          segmento?: string | null
          status_geral?: string | null
          updated_at?: string
          visivel?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tasks_projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks_sprint_tarefas: {
        Row: {
          created_at: string
          descricao: string | null
          feita_em: string | null
          ia_alerta: string | null
          id: string
          ordem: number | null
          origem: string
          parent_tarefa_id: string | null
          prazo: string | null
          prioridade: string | null
          projeto_id: string | null
          responsaveis: string[]
          responsavel: string | null
          reuniao_activity_id: string | null
          sprint_id: string
          status: string
          titulo: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          feita_em?: string | null
          ia_alerta?: string | null
          id?: string
          ordem?: number | null
          origem?: string
          parent_tarefa_id?: string | null
          prazo?: string | null
          prioridade?: string | null
          projeto_id?: string | null
          responsaveis?: string[]
          responsavel?: string | null
          reuniao_activity_id?: string | null
          sprint_id: string
          status?: string
          titulo: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          feita_em?: string | null
          ia_alerta?: string | null
          id?: string
          ordem?: number | null
          origem?: string
          parent_tarefa_id?: string | null
          prazo?: string | null
          prioridade?: string | null
          projeto_id?: string | null
          responsaveis?: string[]
          responsavel?: string | null
          reuniao_activity_id?: string | null
          sprint_id?: string
          status?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_sprint_tarefas_parent_tarefa_id_fkey"
            columns: ["parent_tarefa_id"]
            isOneToOne: false
            referencedRelation: "tasks_sprint_tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sprint_tarefas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "tasks_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sprint_tarefas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_tasks_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sprint_tarefas_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "tasks_sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks_sprints: {
        Row: {
          arquitetura: string | null
          avaliacao: string | null
          ciclo_id: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          desenvolvedor: string | null
          duracao_semanas: number | null
          encerrada_em: string | null
          escopo: string | null
          id: string
          is_backlog: boolean
          meta: string | null
          nome: string
          project_priorities_by_dev: Json
          projeto_id: string | null
          status: string
          tipo_sistema: string | null
        }
        Insert: {
          arquitetura?: string | null
          avaliacao?: string | null
          ciclo_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          desenvolvedor?: string | null
          duracao_semanas?: number | null
          encerrada_em?: string | null
          escopo?: string | null
          id?: string
          is_backlog?: boolean
          meta?: string | null
          nome: string
          project_priorities_by_dev?: Json
          projeto_id?: string | null
          status?: string
          tipo_sistema?: string | null
        }
        Update: {
          arquitetura?: string | null
          avaliacao?: string | null
          ciclo_id?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          desenvolvedor?: string | null
          duracao_semanas?: number | null
          encerrada_em?: string | null
          escopo?: string | null
          id?: string
          is_backlog?: boolean
          meta?: string | null
          nome?: string
          project_priorities_by_dev?: Json
          projeto_id?: string | null
          status?: string
          tipo_sistema?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_sprints_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "tasks_ciclos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sprints_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "tasks_projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sprints_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "vw_tasks_projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goals: {
        Row: {
          created_at: string
          id: string
          mes: string
          pipeline_id: string
          tipo: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          mes: string
          pipeline_id?: string
          tipo: string
          updated_at?: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          id?: string
          mes?: string
          pipeline_id?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      user_google_tokens: {
        Row: {
          access_token: string
          connected_at: string
          created_at: string
          disconnected_at: string | null
          expires_at: string
          google_email: string
          google_sub: string | null
          id: string
          last_refresh_at: string | null
          refresh_token: string
          scopes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          expires_at: string
          google_email: string
          google_sub?: string | null
          id?: string
          last_refresh_at?: string | null
          refresh_token: string
          scopes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          connected_at?: string
          created_at?: string
          disconnected_at?: string | null
          expires_at?: string
          google_email?: string
          google_sub?: string | null
          id?: string
          last_refresh_at?: string | null
          refresh_token?: string
          scopes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string | null
          id: string
          module: Database["public"]["Enums"]["app_module"]
          permission: Database["public"]["Enums"]["module_permission"]
          submodule: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module: Database["public"]["Enums"]["app_module"]
          permission?: Database["public"]["Enums"]["module_permission"]
          submodule?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module?: Database["public"]["Enums"]["app_module"]
          permission?: Database["public"]["Enums"]["module_permission"]
          submodule?: string
          user_id?: string
        }
        Relationships: []
      }
      user_pipeline_access: {
        Row: {
          created_at: string
          pipeline_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          pipeline_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          pipeline_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pipeline_access_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pipeline_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pipeline_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sales_weights: {
        Row: {
          active: boolean
          created_at: string
          id: string
          pipeline_id: string
          updated_at: string
          user_id: string
          weight_pct: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          pipeline_id: string
          updated_at?: string
          user_id: string
          weight_pct: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          pipeline_id?: string
          updated_at?: string
          user_id?: string
          weight_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_sales_weights_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sales_weights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sales_weights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "team_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          bank_transaction_id: string | null
          cep: string | null
          contact_id: string | null
          contrato_assinado: boolean | null
          contrato_assinado_em: string | null
          cpf_cnpj: string | null
          created_at: string | null
          data_envio_nf: string | null
          data_pagamento_confirmada: string | null
          data_venda: string
          descricao_servico: string | null
          email: string | null
          email_fiscal: string | null
          endereco: string | null
          entrada_paga: boolean | null
          entrada_paga_em: string | null
          forma_pagamento: string | null
          hubspot_stage: string | null
          id: string
          inscricao_municipal: string | null
          lia_customer_document: string | null
          lia_offer_id: string | null
          lia_order_id: string | null
          metodo_pagamento_confirmado: string | null
          nome: string
          numero_nf: number | null
          observacoes_fiscais: string | null
          origem: string | null
          parcelas: number | null
          por_indicacao: boolean | null
          produto: string
          produto_venda: string | null
          razao_social: string | null
          status: string
          status_nf: string | null
          status_pagamento: string | null
          telefone: string | null
          telefone_fiscal: string | null
          tipo_contrato: string | null
          total_parcelas: number | null
          valor: number
          valor_nf: number | null
        }
        Insert: {
          bank_transaction_id?: string | null
          cep?: string | null
          contact_id?: string | null
          contrato_assinado?: boolean | null
          contrato_assinado_em?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_envio_nf?: string | null
          data_pagamento_confirmada?: string | null
          data_venda: string
          descricao_servico?: string | null
          email?: string | null
          email_fiscal?: string | null
          endereco?: string | null
          entrada_paga?: boolean | null
          entrada_paga_em?: string | null
          forma_pagamento?: string | null
          hubspot_stage?: string | null
          id?: string
          inscricao_municipal?: string | null
          lia_customer_document?: string | null
          lia_offer_id?: string | null
          lia_order_id?: string | null
          metodo_pagamento_confirmado?: string | null
          nome: string
          numero_nf?: number | null
          observacoes_fiscais?: string | null
          origem?: string | null
          parcelas?: number | null
          por_indicacao?: boolean | null
          produto: string
          produto_venda?: string | null
          razao_social?: string | null
          status?: string
          status_nf?: string | null
          status_pagamento?: string | null
          telefone?: string | null
          telefone_fiscal?: string | null
          tipo_contrato?: string | null
          total_parcelas?: number | null
          valor?: number
          valor_nf?: number | null
        }
        Update: {
          bank_transaction_id?: string | null
          cep?: string | null
          contact_id?: string | null
          contrato_assinado?: boolean | null
          contrato_assinado_em?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_envio_nf?: string | null
          data_pagamento_confirmada?: string | null
          data_venda?: string
          descricao_servico?: string | null
          email?: string | null
          email_fiscal?: string | null
          endereco?: string | null
          entrada_paga?: boolean | null
          entrada_paga_em?: string | null
          forma_pagamento?: string | null
          hubspot_stage?: string | null
          id?: string
          inscricao_municipal?: string | null
          lia_customer_document?: string | null
          lia_offer_id?: string | null
          lia_order_id?: string | null
          metodo_pagamento_confirmado?: string | null
          nome?: string
          numero_nf?: number | null
          observacoes_fiscais?: string | null
          origem?: string | null
          parcelas?: number | null
          por_indicacao?: boolean | null
          produto?: string
          produto_venda?: string | null
          razao_social?: string | null
          status?: string
          status_nf?: string | null
          status_pagamento?: string | null
          telefone?: string | null
          telefone_fiscal?: string | null
          tipo_contrato?: string | null
          total_parcelas?: number | null
          valor?: number
          valor_nf?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_bank_transaction_id_fkey"
            columns: ["bank_transaction_id"]
            isOneToOne: false
            referencedRelation: "vw_financeiro_conciliacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_analyses: {
        Row: {
          analysis: Json
          created_at: string | null
          id: string
          pipeline: Json | null
          user_id: string
          vendor_name: string | null
        }
        Insert: {
          analysis: Json
          created_at?: string | null
          id?: string
          pipeline?: Json | null
          user_id: string
          vendor_name?: string | null
        }
        Update: {
          analysis?: Json
          created_at?: string | null
          id?: string
          pipeline?: Json | null
          user_id?: string
          vendor_name?: string | null
        }
        Relationships: []
      }
      wh_inbound_deadletter: {
        Row: {
          attempted_payload: Json
          conversation_id: string | null
          error_code: string | null
          error_message: string | null
          id: string
          raw_webhook: Json | null
          received_at: string
          reprocessed_at: string | null
          reprocessed_message_id: string | null
        }
        Insert: {
          attempted_payload: Json
          conversation_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          raw_webhook?: Json | null
          received_at?: string
          reprocessed_at?: string | null
          reprocessed_message_id?: string | null
        }
        Update: {
          attempted_payload?: Json
          conversation_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          raw_webhook?: Json | null
          received_at?: string
          reprocessed_at?: string | null
          reprocessed_message_id?: string | null
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          bot_disabled: boolean
          bot_notes: Json | null
          bot_score: number | null
          classified_product: string | null
          closed_at: string | null
          closed_reason: string | null
          contact_id: string | null
          conversation_type: string
          created_at: string
          deal_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          group_jid: string | null
          hidden_at: string | null
          hidden_by: string | null
          id: string
          inbound_provider: string
          last_inbound_at: string | null
          last_inbound_via: string | null
          last_outbound_at: string | null
          origem_campaign_id: string | null
          product: string | null
          purpose: string | null
          send_instance: string | null
          source: string
          source_type: string | null
          state: string
          step_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          bot_disabled?: boolean
          bot_notes?: Json | null
          bot_score?: number | null
          classified_product?: string | null
          closed_at?: string | null
          closed_reason?: string | null
          contact_id?: string | null
          conversation_type?: string
          created_at?: string
          deal_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          group_jid?: string | null
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          inbound_provider?: string
          last_inbound_at?: string | null
          last_inbound_via?: string | null
          last_outbound_at?: string | null
          origem_campaign_id?: string | null
          product?: string | null
          purpose?: string | null
          send_instance?: string | null
          source?: string
          source_type?: string | null
          state?: string
          step_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          bot_disabled?: boolean
          bot_notes?: Json | null
          bot_score?: number | null
          classified_product?: string | null
          closed_at?: string | null
          closed_reason?: string | null
          contact_id?: string | null
          conversation_type?: string
          created_at?: string
          deal_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          group_jid?: string | null
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          inbound_provider?: string
          last_inbound_at?: string | null
          last_inbound_via?: string | null
          last_outbound_at?: string | null
          origem_campaign_id?: string | null
          product?: string | null
          purpose?: string | null
          send_instance?: string | null
          source?: string
          source_type?: string | null
          state?: string
          step_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_origem_campaign_id_fkey"
            columns: ["origem_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_origem_campaign_id_fkey"
            columns: ["origem_campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_campaigns_investimento_mes"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_origem_campaign_id_fkey"
            columns: ["origem_campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_campaigns_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_send_instance_fkey"
            columns: ["send_instance"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["slug"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          created_at: string
          emoji: string
          enabled: boolean
          env_prefix: string
          is_personal: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          emoji?: string
          enabled?: boolean
          env_prefix: string
          is_personal?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          emoji?: string
          enabled?: boolean
          env_prefix?: string
          is_personal?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string
          conversation_id: string
          deleted_at: string | null
          deleted_by: string | null
          delivered_at: string | null
          delivery_status: string | null
          direction: string
          failed_at: string | null
          id: string
          media_caption: string | null
          media_duration_sec: number | null
          media_filename: string | null
          media_mime: string | null
          media_type: string | null
          media_url: string | null
          metadata: Json | null
          provider: string
          read_at: string | null
          send_error: string | null
          sender_type: string
          sender_user_id: string | null
          sent_at: string
          status_updated_at: string | null
          transcript: string | null
          transcript_status: string | null
          zapi_message_id: string | null
        }
        Insert: {
          body: string
          conversation_id: string
          deleted_at?: string | null
          deleted_by?: string | null
          delivered_at?: string | null
          delivery_status?: string | null
          direction: string
          failed_at?: string | null
          id?: string
          media_caption?: string | null
          media_duration_sec?: number | null
          media_filename?: string | null
          media_mime?: string | null
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          provider?: string
          read_at?: string | null
          send_error?: string | null
          sender_type: string
          sender_user_id?: string | null
          sent_at?: string
          status_updated_at?: string | null
          transcript?: string | null
          transcript_status?: string | null
          zapi_message_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          deleted_at?: string | null
          deleted_by?: string | null
          delivered_at?: string | null
          delivery_status?: string | null
          direction?: string
          failed_at?: string | null
          id?: string
          media_caption?: string | null
          media_duration_sec?: number | null
          media_filename?: string | null
          media_mime?: string | null
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          provider?: string
          read_at?: string | null
          send_error?: string | null
          sender_type?: string
          sender_user_id?: string | null
          sent_at?: string
          status_updated_at?: string | null
          transcript?: string | null
          transcript_status?: string | null
          zapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_outbound_queue: {
        Row: {
          attempts: number
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          deal_id: string | null
          id: string
          kind: string
          last_error: string | null
          payload: Json
          phone: string
          provider_used: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          payload?: Json
          phone: string
          provider_used?: string | null
          scheduled_at: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          contact_id?: string | null
          conversation_id?: string | null
          created_at?: string
          deal_id?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          payload?: Json
          phone?: string
          provider_used?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_outbound_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_phone_blocklist: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          phone: string
          phone_normalized: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          phone: string
          phone_normalized: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          phone?: string
          phone_normalized?: string
        }
        Relationships: []
      }
      workflow_enrollments: {
        Row: {
          cancelled_at: string | null
          cancelled_reason: string | null
          completed_at: string | null
          contact_id: string
          current_step: number | null
          deal_id: string | null
          enrolled_at: string | null
          id: string
          last_step_run_at: string | null
          next_step_at: string | null
          status: string
          workflow_id: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          completed_at?: string | null
          contact_id: string
          current_step?: number | null
          deal_id?: string | null
          enrolled_at?: string | null
          id?: string
          last_step_run_at?: string | null
          next_step_at?: string | null
          status?: string
          workflow_id: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          completed_at?: string | null
          contact_id?: string
          current_step?: number | null
          deal_id?: string | null
          enrolled_at?: string | null
          id?: string
          last_step_run_at?: string | null
          next_step_at?: string | null
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_enrollments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_enrollments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_enrollments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "workflow_enrollments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "workflow_enrollments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "email_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      zapi_health_log: {
        Row: {
          alert_sent: boolean
          battery_level: number | null
          checked_at: string
          connected: boolean
          error_message: string | null
          http_status: number | null
          id: string
          instance_slug: string
          raw_response: Json | null
          response_time_ms: number | null
          session_status: string | null
          smartphone_connected: boolean | null
        }
        Insert: {
          alert_sent?: boolean
          battery_level?: number | null
          checked_at?: string
          connected: boolean
          error_message?: string | null
          http_status?: number | null
          id?: string
          instance_slug?: string
          raw_response?: Json | null
          response_time_ms?: number | null
          session_status?: string | null
          smartphone_connected?: boolean | null
        }
        Update: {
          alert_sent?: boolean
          battery_level?: number | null
          checked_at?: string
          connected?: boolean
          error_message?: string | null
          http_status?: number | null
          id?: string
          instance_slug?: string
          raw_response?: Json | null
          response_time_ms?: number | null
          session_status?: string | null
          smartphone_connected?: boolean | null
        }
        Relationships: []
      }
      zapi_webhook_debug: {
        Row: {
          id: number
          payload: Json | null
          received_at: string | null
        }
        Insert: {
          id?: number
          payload?: Json | null
          received_at?: string | null
        }
        Update: {
          id?: number
          payload?: Json | null
          received_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      avg_time_in_stage: {
        Row: {
          avg_days: number | null
          display_order: number | null
          product: string | null
          stage_name: string | null
          transitions: number | null
        }
        Relationships: []
      }
      contacts_full: {
        Row: {
          active_deals_count: number | null
          activities_count: number | null
          address: string | null
          area_atuacao: string | null
          cargo: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          days_since_creation: number | null
          days_since_last_activity: number | null
          deals_count: number | null
          email: string | null
          faixa_de_faturamento: string | null
          first_conversion: string | null
          first_conversion_date: string | null
          first_name: string | null
          fonte_registro: string | null
          full_name: string | null
          hubspot_id: number | null
          hubspot_owner: string | null
          id: string | null
          instagram_opt_in: boolean | null
          last_activity_at: string | null
          last_activity_date: string | null
          last_activity_subject: string | null
          last_activity_type: string | null
          last_deal_amount: number | null
          last_deal_name: string | null
          last_deal_product: string | null
          last_deal_stage: string | null
          last_name: string | null
          lead_status: string | null
          lifecycle_stage: string | null
          linkedin_url: string | null
          lost_deals_count: number | null
          manychat_id: string | null
          marketing_status: string | null
          motivo_para_aprender_ia: string | null
          numero_de_liderados: string | null
          objetivo_com_a_comunidade: string | null
          owner_id: string | null
          phone: string | null
          produto_interesse: string[] | null
          renda_mensal: string | null
          state: string | null
          total_deal_value: number | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          website_url: string | null
          whatsapp: string | null
          whatsapp_opt_in: boolean | null
          won_deal_value: number | null
          won_deals_count: number | null
          zip_code: string | null
        }
        Relationships: []
      }
      deals_full: {
        Row: {
          amount: number | null
          assigned_to: string | null
          bot_inbound_origin: boolean | null
          bot_notes: Json | null
          cadence_status: string | null
          calculadora_preenchida_at: string | null
          canal_origem: string | null
          closed_at: string | null
          contact_company: string | null
          contact_email: string | null
          contact_first_name: string | null
          contact_id: string | null
          contact_last_name: string | null
          contact_phone: string | null
          created_at: string | null
          days_in_stage: number | null
          deal_status: string | null
          deal_type: string | null
          economia_horas_mes: number | null
          economia_reais_mes: number | null
          faixa_faturamento: string | null
          first_seen_by_human_at: string | null
          forecast_tags: string[] | null
          form_origin: string | null
          hubspot_id: number | null
          id: string | null
          is_aditivo: boolean | null
          is_lost: boolean | null
          is_won: boolean | null
          lead_status: string | null
          lost_reason: string | null
          motivo_perda: string | null
          name: string | null
          observacoes: string | null
          owner_id: string | null
          owner_state: string | null
          owner_state_changed_at: string | null
          pain_principal: string | null
          parent_deal_id: string | null
          periodo_preferido_diagnostico: string | null
          pipeline_id: string | null
          pipeline_name: string | null
          por_indicacao: boolean | null
          prev_liquidez: string | null
          product: string | null
          proposal_link: string | null
          proposal_links: Json | null
          qualification_status: string | null
          recontato_em: string | null
          roi_estimado: number | null
          stage_entered_at: string | null
          stage_id: string | null
          stage_name: string | null
          stage_order: number | null
          stage_probability: number | null
          tag_forecast: string | null
          tentativas_contato: number | null
          ultimo_contato: string | null
          updated_at: string | null
          valor_declarado: number | null
          valor_fechamento: number | null
          valor_reajustado: number | null
          whatsapp_send_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_parent_deal_id_fkey"
            columns: ["parent_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_parent_deal_id_fkey"
            columns: ["parent_deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_parent_deal_id_fkey"
            columns: ["parent_deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deals_parent_deal_id_fkey"
            columns: ["parent_deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas_mensal: {
        Row: {
          categoria: string | null
          mes: string | null
          quantidade: number | null
          total: number | null
        }
        Relationships: []
      }
      email_campaign_metrics: {
        Row: {
          bounced: number | null
          click_rate: number | null
          clicked: number | null
          delivered: number | null
          from_name: string | null
          id: string | null
          name: string | null
          open_rate: number | null
          opened: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          total_sends: number | null
          unsubscribed: number | null
        }
        Relationships: []
      }
      fluxo_caixa_mensal: {
        Row: {
          mes: string | null
          parcelas_pagas: number | null
          total_recebido: number | null
        }
        Relationships: []
      }
      form_metrics: {
        Row: {
          form_id: string | null
          form_name: string | null
          last_submission_at: string | null
          product: string | null
          slug: string | null
          submissions_last_30d: number | null
          submissions_last_7d: number | null
          total_submissions: number | null
          unique_sources: number | null
        }
        Relationships: []
      }
      mads_v_ads_crm_30d: {
        Row: {
          ad_uuid: string | null
          cpmql_brl: number | null
          cpmql_semaforo: string | null
          ganho: number | null
          gasto_30d: number | null
          leads_crm: number | null
          mql: number | null
          sal: number | null
          taxa_qualif_pct: number | null
          taxa_qualif_semaforo: string | null
        }
        Relationships: []
      }
      mads_v_campaign_performance_30d: {
        Row: {
          alcance_30d: number | null
          cliques_link_30d: number | null
          cpl_brl: number | null
          ctr_pct: number | null
          custo_por_lp_view: number | null
          gasto_30d: number | null
          id: string | null
          impressoes_30d: number | null
          leads_30d: number | null
          lp_views_30d: number | null
          meta_campaign_id: string | null
          nome: string | null
          orcamento_diario_brl: number | null
          status: string | null
          tipo_lead: string | null
        }
        Relationships: []
      }
      mads_v_campaign_performance_multi: {
        Row: {
          cliques_link_24h: number | null
          cliques_link_30d: number | null
          cliques_link_7d: number | null
          cliques_link_90d: number | null
          created_at: string | null
          gasto_24h: number | null
          gasto_30d: number | null
          gasto_7d: number | null
          gasto_90d: number | null
          id: string | null
          impressoes_24h: number | null
          impressoes_30d: number | null
          impressoes_7d: number | null
          impressoes_90d: number | null
          leads_24h: number | null
          leads_30d: number | null
          leads_7d: number | null
          leads_90d: number | null
          lp_destino: string | null
          lp_views_24h: number | null
          lp_views_30d: number | null
          lp_views_7d: number | null
          lp_views_90d: number | null
          meta_campaign_id: string | null
          nome: string | null
          orcamento_diario_brl: number | null
          status: string | null
          tipo_lead: string | null
        }
        Insert: {
          cliques_link_24h?: never
          cliques_link_30d?: never
          cliques_link_7d?: never
          cliques_link_90d?: never
          created_at?: string | null
          gasto_24h?: never
          gasto_30d?: never
          gasto_7d?: never
          gasto_90d?: never
          id?: string | null
          impressoes_24h?: never
          impressoes_30d?: never
          impressoes_7d?: never
          impressoes_90d?: never
          leads_24h?: never
          leads_30d?: never
          leads_7d?: never
          leads_90d?: never
          lp_destino?: string | null
          lp_views_24h?: never
          lp_views_30d?: never
          lp_views_7d?: never
          lp_views_90d?: never
          meta_campaign_id?: string | null
          nome?: string | null
          orcamento_diario_brl?: never
          status?: string | null
          tipo_lead?: string | null
        }
        Update: {
          cliques_link_24h?: never
          cliques_link_30d?: never
          cliques_link_7d?: never
          cliques_link_90d?: never
          created_at?: string | null
          gasto_24h?: never
          gasto_30d?: never
          gasto_7d?: never
          gasto_90d?: never
          id?: string | null
          impressoes_24h?: never
          impressoes_30d?: never
          impressoes_7d?: never
          impressoes_90d?: never
          leads_24h?: never
          leads_30d?: never
          leads_7d?: never
          leads_90d?: never
          lp_destino?: string | null
          lp_views_24h?: never
          lp_views_30d?: never
          lp_views_7d?: never
          lp_views_90d?: never
          meta_campaign_id?: string | null
          nome?: string | null
          orcamento_diario_brl?: never
          status?: string | null
          tipo_lead?: string | null
        }
        Relationships: []
      }
      mads_v_conversao_vs_crm: {
        Row: {
          alcance_30d: number | null
          campanha_nome: string | null
          campanha_uuid: string | null
          cliques_link_30d: number | null
          contacts_crm_30d: number | null
          contacts_crm_meta_30d: number | null
          cpl_crm_brl: number | null
          cpl_meta_brl: number | null
          diagnostico: string | null
          divergencia_absoluta: number | null
          divergencia_meta_menos_crm: number | null
          form_submissions_30d: number | null
          gasto_30d_brl: number | null
          impressoes_30d: number | null
          leads_meta_30d: number | null
          lp_views_30d: number | null
          meta_campaign_id: string | null
          orcamento_diario_brl: number | null
          precisa_atencao: boolean | null
          recomendacao_acao: string | null
          severidade: string | null
          status: string | null
          status_conexao: string | null
          taxa_conversao_crm_pct: number | null
          taxa_conversao_meta_pct: number | null
          tipo_lead: string | null
          utm_campaign: string | null
        }
        Relationships: []
      }
      mads_v_criativos_metricas: {
        Row: {
          ad_nome: string | null
          ad_status: string | null
          ad_uuid: string | null
          adset_nome: string | null
          alcance: number | null
          ate: string | null
          avg_time_sec: number | null
          body_rate_pct: number | null
          body_semaforo: string | null
          campanha_nome: string | null
          cliques_link: number | null
          cpl_brl: number | null
          cpmql_brl: number | null
          cpmql_semaforo: string | null
          cpsal_brl: number | null
          cpsal_semaforo: string | null
          ctr_real_pct: number | null
          ctr_semaforo: string | null
          cvr_pct: number | null
          cvr_semaforo: string | null
          desde: string | null
          diagnostico: string | null
          ganhos_no_crm: number | null
          gasto: number | null
          hook_rate_pct: number | null
          hook_semaforo: string | null
          impressoes: number | null
          leads: number | null
          leads_crm: number | null
          lp_views: number | null
          meta_ad_id: string | null
          meta_campaign_id: string | null
          mql_no_crm: number | null
          pipe_ativo: number | null
          retencao_75_pct: number | null
          retencao_semaforo: string | null
          sal_no_crm: number | null
          sql_no_crm: number | null
          taxa_qualificacao_pct: number | null
          valor_ganho_brl: number | null
          video_3s: number | null
          video_p100: number | null
          video_p25: number | null
          video_p50: number | null
          video_p75: number | null
          video_p95: number | null
          video_plays: number | null
        }
        Relationships: []
      }
      mads_v_execution_falhas: {
        Row: {
          acao: string | null
          created_at: string | null
          duracao_ms: number | null
          entidade_tipo: string | null
          erro_mensagem: string | null
          id: string | null
          iniciado_por: string | null
          is_transient: boolean | null
          origem: string | null
          status_code: number | null
        }
        Insert: {
          acao?: string | null
          created_at?: string | null
          duracao_ms?: number | null
          entidade_tipo?: string | null
          erro_mensagem?: string | null
          id?: string | null
          iniciado_por?: string | null
          is_transient?: never
          origem?: string | null
          status_code?: number | null
        }
        Update: {
          acao?: string | null
          created_at?: string | null
          duracao_ms?: number | null
          entidade_tipo?: string | null
          erro_mensagem?: string | null
          id?: string | null
          iniciado_por?: string | null
          is_transient?: never
          origem?: string | null
          status_code?: number | null
        }
        Relationships: []
      }
      mads_v_funil_diario: {
        Row: {
          campanha_nome: string | null
          campanha_uuid: string | null
          cliques_link: number | null
          contacts_crm: number | null
          dia: string | null
          gasto_brl: number | null
          impressoes: number | null
          leads_meta: number | null
          lp_views: number | null
          taxa_conversao_pct: number | null
          utm_campaign: string | null
        }
        Relationships: []
      }
      mads_v_health_check: {
        Row: {
          campanhas: string | null
          precisam_atencao: number | null
          status_conexao: string | null
          total_campanhas: number | null
        }
        Relationships: []
      }
      mads_v_lp_performance: {
        Row: {
          alerta: string | null
          ativa: boolean | null
          clarity_sample_rate_pct: number | null
          clarity_sessions_30d: number | null
          clarity_sessions_7d: number | null
          clarity_users_30d: number | null
          cpl_real_30d: number | null
          cvr_clarity_pct_30d: number | null
          cvr_meta_pct_30d: number | null
          cvr_meta_pct_7d: number | null
          dead_clicks_30d: number | null
          display_order: number | null
          engagement_seg_avg: number | null
          form_slug: string | null
          gasto_meta_30d: number | null
          gasto_meta_7d: number | null
          health_status: string | null
          id: string | null
          meta_lp_views_30d: number | null
          meta_lp_views_7d: number | null
          nome: string | null
          pixel_meta_detectado: boolean | null
          rage_clicks_30d: number | null
          script_errors_30d: number | null
          scroll_depth_pct_avg: number | null
          sessions_clarity_30d: number | null
          sessions_clarity_7d: number | null
          submissions_24h: number | null
          submissions_30d: number | null
          submissions_7d: number | null
          submissions_direct_30d: number | null
          submissions_linktree_30d: number | null
          submissions_meta_30d: number | null
          submissions_meta_7d: number | null
          taxa_conversao_clarity_pct: number | null
          taxa_conversao_meta_pct: number | null
          tipo_lead: string | null
          ultimo_check_em: string | null
          ultimo_status_http: number | null
          ultimo_tempo_ms: number | null
          url: string | null
          users_clarity_30d: number | null
          utm_campaign_vinculada: string | null
        }
        Relationships: []
      }
      mads_v_lp_performance_multi: {
        Row: {
          ativa: boolean | null
          dias_desde_reset: number | null
          display_order: number | null
          gasto_meta_24h: number | null
          gasto_meta_30d: number | null
          gasto_meta_7d: number | null
          gasto_meta_90d: number | null
          gasto_meta_desde_reset: number | null
          id: string | null
          meta_lp_views_24h: number | null
          meta_lp_views_30d: number | null
          meta_lp_views_7d: number | null
          meta_lp_views_90d: number | null
          meta_lp_views_desde_reset: number | null
          nome: string | null
          pixel_meta_detectado: boolean | null
          refeita_em: string | null
          submissions_24h: number | null
          submissions_30d: number | null
          submissions_7d: number | null
          submissions_90d: number | null
          submissions_desde_reset: number | null
          submissions_meta_24h: number | null
          submissions_meta_30d: number | null
          submissions_meta_7d: number | null
          submissions_meta_90d: number | null
          submissions_meta_desde_reset: number | null
          tipo_lead: string | null
          ultimo_check_em: string | null
          ultimo_status_http: number | null
          ultimo_tempo_ms: number | null
          url: string | null
        }
        Relationships: []
      }
      mads_v_mql_diario: {
        Row: {
          dia: string | null
          mql: number | null
        }
        Relationships: []
      }
      mads_v_top_ads_30d: {
        Row: {
          ad_nome: string | null
          ad_uuid: string | null
          campanha_nome: string | null
          cliques_link: number | null
          cpc_brl: number | null
          cpl_brl: number | null
          cpl_view_brl: number | null
          ctr_pct: number | null
          gasto_brl: number | null
          impressoes: number | null
          leads: number | null
          lp_views: number | null
          meta_ad_id: string | null
          status: string | null
          tipo_lead: string | null
        }
        Relationships: []
      }
      mql_volume: {
        Row: {
          mql_count: number | null
          product: string | null
          total_count: number | null
          week: string | null
        }
        Relationships: []
      }
      product_metrics: {
        Row: {
          active_deals: number | null
          avg_deal_size: number | null
          lost_deals: number | null
          pipeline_value: number | null
          product: string | null
          win_rate: number | null
          won_deals: number | null
        }
        Relationships: []
      }
      stage_conversion: {
        Row: {
          deal_count: number | null
          display_order: number | null
          product: string | null
          stage_name: string | null
          total_amount: number | null
        }
        Relationships: []
      }
      team_directory: {
        Row: {
          avatar_url: string | null
          email: string | null
          full_name: string | null
          id: string | null
          role: string | null
        }
        Insert: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          role?: string | null
        }
        Update: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          role?: string | null
        }
        Relationships: []
      }
      v_closer_forecast: {
        Row: {
          forecast_declarado: number | null
          forecast_estatistico: number | null
          mes: string | null
          owner_id: string | null
          pipe_total: number | null
          pipeline_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      v_closer_resumo: {
        Row: {
          contratos: number | null
          ganhos: number | null
          mes: string | null
          meta: number | null
          meta_contrato: number | null
          meta_ganhos: number | null
          meta_proposta: number | null
          meta_rr: number | null
          owner_id: string | null
          pace_projetado: number | null
          pipeline_id: string | null
          progresso_pct: number | null
          propostas: number | null
          realizado: number | null
          rrs: number | null
        }
        Relationships: []
      }
      v_conversao_historica_pipeline: {
        Row: {
          display_order: number | null
          pipeline_id: string | null
          qtd: number | null
          stage: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      v_deal_timeline: {
        Row: {
          ai_next_steps: Json | null
          ai_sentiment: string | null
          ai_summary: string | null
          contact_id: string | null
          deal_id: string | null
          duration_sec: number | null
          event_at: string | null
          id: string | null
          metadata: Json | null
          participants: Json | null
          preview: string | null
          source: string | null
          title: string | null
          transcript: string | null
          type: string | null
        }
        Relationships: []
      }
      v_deals_silent_leads: {
        Row: {
          contact_id: string | null
          deal_id: string | null
          deal_name: string | null
          dias_desde_ultimo_outbound: number | null
          first_name: string | null
          last_inbound_at: string | null
          last_name: string | null
          last_outbound_at: string | null
          outbound_sem_resposta: number | null
          phone: string | null
          qualification_status: string | null
          severidade: string | null
          stage_id: string | null
          whatsapp: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      v_followup_reunioes: {
        Row: {
          ai_summary: string | null
          id: string | null
          scrum_analysis: Json | null
          started_at: string | null
          title: string | null
          transcript: string | null
          transcript_len: number | null
        }
        Insert: {
          ai_summary?: string | null
          id?: string | null
          scrum_analysis?: never
          started_at?: string | null
          title?: string | null
          transcript?: string | null
          transcript_len?: never
        }
        Update: {
          ai_summary?: string | null
          id?: string | null
          scrum_analysis?: never
          started_at?: string | null
          title?: string | null
          transcript?: string | null
          transcript_len?: never
        }
        Relationships: []
      }
      v_inbox_conversation_meta: {
        Row: {
          conversation_id: string | null
          has_human: boolean | null
          last_body: string | null
          last_sender_type: string | null
          last_sent_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_meta_capi_daily: {
        Row: {
          dia: string | null
          enviados: number | null
          event_name: string | null
          falhas: number | null
          pendentes: number | null
          pulados: number | null
          valor_total_brl: number | null
        }
        Relationships: []
      }
      v_meta_capi_recent: {
        Row: {
          attempt_count: number | null
          deal_name: string | null
          deal_value: number | null
          email: string | null
          event_at: string | null
          event_id: string | null
          event_name: string | null
          first_name: string | null
          id: string | null
          last_error: string | null
          last_name: string | null
          meta_events_received: string | null
          meta_fbtrace_id: string | null
          sent_at: string | null
          status: string | null
          test_event_code: string | null
          utm_campaign: string | null
          utm_source: string | null
        }
        Relationships: []
      }
      v_meta_capi_status: {
        Row: {
          failed: number | null
          faltam_pra_otimizacao_sal: number | null
          last_sent_at: string | null
          pending: number | null
          sent_24h: number | null
          sent_30d: number | null
          sent_7d: number | null
          sent_total: number | null
          skipped_old: number | null
        }
        Relationships: []
      }
      v_mql_sem_followup: {
        Row: {
          cargo: string | null
          contact_id: string | null
          deal_id: string | null
          email: string | null
          faixa_de_faturamento: string | null
          horas_no_mql: number | null
          lead: string | null
          mql_silent_alert_sent_at: string | null
          phone: string | null
          utm_campaign: string | null
          utm_source: string | null
          virou_mql_em: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deal_stage_history_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
        ]
      }
      v_msgs_stuck_undelivered: {
        Row: {
          body_preview: string | null
          contact_id: string | null
          conversation_id: string | null
          delivery_status: string | null
          group_jid: string | null
          group_name: string | null
          id: string | null
          minutos_sem_confirmacao: number | null
          send_error: string | null
          sent_at: string | null
          zapi_message_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_reunioes_agenda: {
        Row: {
          analisada: boolean | null
          categoria: string | null
          cliente: string | null
          deal_id: string | null
          id: string | null
          oculto: boolean | null
          started_at: string | null
          tarefas_criadas: string | null
          title: string | null
          transcript_len: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
        ]
      }
      v_scrum_reunioes: {
        Row: {
          ai_summary: string | null
          analisado_em: string | null
          id: string | null
          scrum_analysis: Json | null
          started_at: string | null
          title: string | null
          transcript: string | null
          transcript_len: number | null
        }
        Insert: {
          ai_summary?: string | null
          analisado_em?: never
          id?: string | null
          scrum_analysis?: never
          started_at?: string | null
          title?: string | null
          transcript?: string | null
          transcript_len?: never
        }
        Update: {
          ai_summary?: string | null
          analisado_em?: never
          id?: string | null
          scrum_analysis?: never
          started_at?: string | null
          title?: string | null
          transcript?: string | null
          transcript_len?: never
        }
        Relationships: []
      }
      v_sdr_atividades: {
        Row: {
          chamadas_hoje: number | null
          chamadas_mes: number | null
          chamadas_por_rr: number | null
          idade_mediana_dias: number | null
          leads_mais_4d: number | null
          leads_represados: number | null
          owner_id: string | null
          pipeline_id: string | null
          tempo_atend_min: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      v_sdr_resumo: {
        Row: {
          mes: string | null
          meta: number | null
          owner_id: string | null
          pace_projetado: number | null
          pipeline_id: string | null
          progresso_pct: number | null
          realizado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stage_conversions: {
        Row: {
          mes: string | null
          owner_id: string | null
          pipeline_id: string | null
          stage_name: string | null
          total_entered: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      v_team_calendar: {
        Row: {
          contact_id: string | null
          contact_name: string | null
          created_by: string | null
          deal_id: string | null
          deal_title: string | null
          duration_sec: number | null
          ended_at: string | null
          event_status: string | null
          id: string | null
          meet_link: string | null
          metadata: Json | null
          participants: Json | null
          scheduled_by_email: string | null
          scheduled_by_name: string | null
          scheduled_by_user_id: string | null
          stage_id: string | null
          started_at: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "v_deals_silent_leads"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "vw_deal_inconsistencies_pending"
            referencedColumns: ["deal_id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      v_tempo_medio_etapa: {
        Row: {
          etapa: string | null
          media_dias: number | null
          media_horas: number | null
          mediana_dias: number | null
          total_transicoes: number | null
        }
        Relationships: []
      }
      v_zapi_health_recent: {
        Row: {
          alert_sent: boolean | null
          battery_level: number | null
          checked_at: string | null
          connected: boolean | null
          error_message: string | null
          http_status: number | null
          id: string | null
          instance_slug: string | null
          response_time_ms: number | null
          session_status: string | null
          smartphone_connected: boolean | null
        }
        Relationships: []
      }
      v_zapi_health_summary: {
        Row: {
          checks_24h: number | null
          down_24h: number | null
          instance_slug: string | null
          ok_24h: number | null
          status_atual: boolean | null
          ultimo_check: string | null
          ultimo_down: string | null
          uptime_pct_24h: number | null
        }
        Relationships: []
      }
      vw_acompanhamento_business: {
        Row: {
          display_order: number | null
          estagio: string | null
          meta_proporcional: number | null
          meta_total: number | null
          pace_pct: number | null
          progresso_pct: number | null
          realizado: number | null
          saldo: number | null
        }
        Relationships: []
      }
      vw_acompanhamento_staging: {
        Row: {
          display_order: number | null
          estagio: string | null
          meta_proporcional: number | null
          meta_total: number | null
          pace_pct: number | null
          progresso_pct: number | null
          realizado: number | null
          saldo: number | null
        }
        Relationships: []
      }
      vw_campaigns_investimento_mes: {
        Row: {
          campaign_id: string | null
          campanha: string | null
          investimento: number | null
          mes_label: string | null
          mes_ref: string | null
        }
        Relationships: []
      }
      vw_campaigns_kpis: {
        Row: {
          total_campanhas: number | null
          total_lancamentos: number | null
          valor_total_investido: number | null
        }
        Relationships: []
      }
      vw_campaigns_lista: {
        Row: {
          canal: string | null
          created_at: string | null
          id: string | null
          nome: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          pipeline_id: string | null
          qtd_itens: number | null
          responsavel: string | null
          status: string | null
          total_investido: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_custo_por_sal: {
        Row: {
          custo_por_sal: number | null
          gasto_total: number | null
          mes: string | null
          sal_count: number | null
        }
        Relationships: []
      }
      vw_dashboard_projetos: {
        Row: {
          admin_only: boolean | null
          atualizado_em: string | null
          atualizado_por: string | null
          cliente_id: string | null
          cliente_nome: string | null
          code_alerts_abertos: number | null
          commits_hoje: number | null
          complexidade: string | null
          conteudo_esperado_health: string | null
          created_at: string | null
          data_entrega_prevista: string | null
          data_entrega_real: string | null
          data_inicio: string | null
          db_atualizado_em: string | null
          db_edge_functions: Json | null
          db_riscos: Json | null
          db_secrets_count: number | null
          db_size_bytes: number | null
          db_tabelas: number | null
          db_tabelas_detalhes: Json | null
          db_tabelas_sem_rls: number | null
          dependabot_abertos: number | null
          erros_abertos: number | null
          etapa: string | null
          github_branch: string | null
          github_repo: string | null
          id: string | null
          impedimento_desde: string | null
          impedimento_tipo: string | null
          issues_abertas: number | null
          links: Json | null
          motivo_semaforo: string | null
          nome: string | null
          observacoes: string | null
          prioridade: string | null
          prs_abertos: number | null
          prs_merged_hoje: number | null
          secret_alerts_abertos: number | null
          segmento: string | null
          seguranca_atualizada_em: string | null
          semaforo: string | null
          stack_tipo: string | null
          status_andamento: string | null
          status_geral: string | null
          supabase_project_ref: string | null
          supabase_status: string | null
          ultimo_deploy_em: string | null
          ultimo_deploy_status: string | null
          updated_at: string | null
          url_producao: string | null
          vercel_project_id: string | null
          visivel: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "team_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_deal_inconsistencies_pending: {
        Row: {
          company: string | null
          deal_id: string | null
          deal_name: string | null
          divergencias: Json | null
          first_name: string | null
          last_name: string | null
          qtd_divergencias: number | null
        }
        Relationships: []
      }
      vw_financeiro_conciliacao: {
        Row: {
          banco: string | null
          banco_apelido: string | null
          bank_account_id: string | null
          canal: string | null
          categoria: string | null
          cliente_nome: string | null
          contact_id: string | null
          contraparte_documento: string | null
          contraparte_nome: string | null
          created_at: string | null
          data: string | null
          descricao: string | null
          despesa_id: string | null
          id: string | null
          metodo: string | null
          parcela_id: string | null
          produto: string | null
          reconciliado_em: string | null
          reconciliado_por: string | null
          status_reconciliacao: string | null
          tipo: string | null
          valor: number | null
          venda_id: string | null
          venda_nome: string | null
          venda_valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_despesa_id_fkey"
            columns: ["despesa_id"]
            isOneToOne: false
            referencedRelation: "despesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_funil_acomp_canal_staging: {
        Row: {
          canal: string | null
          display_order: number | null
          etapa: string | null
          volume: number | null
        }
        Relationships: []
      }
      vw_funil_acomp_kpis: {
        Row: {
          dias_uteis_restantes: number | null
          ganhos_meta: number | null
          ganhos_pace: number | null
          ganhos_realizado: number | null
          meta_receita_total: number | null
          mqls_meta: number | null
          mqls_pace: number | null
          mqls_realizado: number | null
          pct_valor_captado: number | null
          projecao_receita: number | null
          valor_captado: number | null
        }
        Relationships: []
      }
      vw_funil_acomp_por_canal: {
        Row: {
          canal: string | null
          display_order: number | null
          etapa: string | null
          volume: number | null
        }
        Relationships: []
      }
      vw_funil_acomp_staging: {
        Row: {
          custo_por_lead: number | null
          display_order: number | null
          etapa: string | null
          meta: number | null
          meta_proporcional: number | null
          pace_conversao_pct: number | null
          pace_pct: number | null
          pct_conversao: number | null
          realizado: number | null
        }
        Relationships: []
      }
      vw_funil_acompanhamento: {
        Row: {
          custo_por_lead: number | null
          display_order: number | null
          etapa: string | null
          meta: number | null
          meta_proporcional: number | null
          pace_pct: number | null
          pct_conversao: number | null
          realizado: number | null
        }
        Relationships: []
      }
      vw_funil_canais: {
        Row: {
          canal: string | null
          mqls_estimados: number | null
          orcamento: number | null
          pct_verba: number | null
        }
        Insert: {
          canal?: string | null
          mqls_estimados?: never
          orcamento?: number | null
          pct_verba?: never
        }
        Update: {
          canal?: string | null
          mqls_estimados?: never
          orcamento?: number | null
          pct_verba?: never
        }
        Relationships: []
      }
      vw_funil_planejamento: {
        Row: {
          custo_por_mql_blended: number | null
          ganhos_necessarios: number | null
          meta_receita_total: number | null
          mqls_necessarios: number | null
          orcamento_total: number | null
          ticket_medio_ponderado: number | null
        }
        Relationships: []
      }
      vw_funil_taxas_conversao: {
        Row: {
          etapa_atual: string | null
          etapa_proxima: string | null
          taxa_conversao_pct: number | null
          transicao: string | null
        }
        Relationships: []
      }
      vw_funil_taxas_staging: {
        Row: {
          etapa_atual: string | null
          etapa_proxima: string | null
          taxa_conversao_pct: number | null
          transicao: string | null
        }
        Relationships: []
      }
      vw_funil_visual: {
        Row: {
          display_order: number | null
          etapa: string | null
          pct_do_topo: number | null
          volume: number | null
        }
        Relationships: []
      }
      vw_funil_visual_staging: {
        Row: {
          display_order: number | null
          etapa: string | null
          pct_do_topo: number | null
          volume: number | null
        }
        Relationships: []
      }
      vw_gantt_projeto: {
        Row: {
          cliente_nome: string | null
          etapa: string | null
          parent_tarefa_id: string | null
          prioridade: string | null
          projeto_fim_previsto: string | null
          projeto_fim_real: string | null
          projeto_id: string | null
          projeto_inicio: string | null
          projeto_nome: string | null
          sprint_fim: string | null
          sprint_id: string | null
          sprint_inicio: string | null
          sprint_nome: string | null
          status_geral: string | null
          tarefa_feita_em: string | null
          tarefa_id: string | null
          tarefa_prazo: string | null
          tarefa_responsaveis: string[] | null
          tarefa_status: string | null
          tarefa_titulo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_tarefas_parent_tarefa_id_fkey"
            columns: ["parent_tarefa_id"]
            isOneToOne: false
            referencedRelation: "sprint_tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_tarefas_parent_tarefa_id_fkey"
            columns: ["parent_tarefa_id"]
            isOneToOne: false
            referencedRelation: "vw_gantt_projeto"
            referencedColumns: ["tarefa_id"]
          },
        ]
      }
      vw_marketing_mqls_por_dia: {
        Row: {
          dia: string | null
          mqls: number | null
        }
        Relationships: []
      }
      vw_marketing_painel_diario: {
        Row: {
          cpmql_anteontem: number | null
          cpmql_media7d: number | null
          cpmql_ontem: number | null
          investimento_anteontem: number | null
          investimento_media7d: number | null
          investimento_ontem: number | null
          mqls_anteontem: number | null
          mqls_media7d: number | null
          mqls_ontem: number | null
          sals_anteontem: number | null
          sals_media7d: number | null
          sals_ontem: number | null
          taxa_sal_mql_anteontem: number | null
          taxa_sal_mql_ontem: number | null
        }
        Relationships: []
      }
      vw_midia_paga_consolidado_diario: {
        Row: {
          acumulado: number | null
          controle_acumulado: number | null
          controle_diario: number | null
          dia: string | null
          gasto_diario: number | null
          pct_acumulado: number | null
          pct_diario: number | null
        }
        Relationships: []
      }
      vw_midia_paga_detalhado_diario: {
        Row: {
          acumulado: number | null
          controle_acumulado: number | null
          controle_diario: number | null
          dia: string | null
          gasto_diario: number | null
          pct_acumulado: number | null
          pct_diario: number | null
        }
        Relationships: []
      }
      vw_midia_paga_grafico: {
        Row: {
          acumulado_esperado: number | null
          acumulado_real: number | null
          dia_num: number | null
        }
        Relationships: []
      }
      vw_midia_paga_kpis: {
        Row: {
          controle_acumulado: number | null
          projecao_fim_mes: number | null
          saldo_restante: number | null
          total_gasto: number | null
        }
        Relationships: []
      }
      vw_midia_paga_orcamento: {
        Row: {
          ano: number | null
          controle_diario: number | null
          dias_no_mes: number | null
          mes: number | null
          orcamento_mensal: number | null
          orcamento_total_consolidado: number | null
        }
        Insert: {
          ano?: number | null
          controle_diario?: never
          dias_no_mes?: never
          mes?: number | null
          orcamento_mensal?: number | null
          orcamento_total_consolidado?: number | null
        }
        Update: {
          ano?: number | null
          controle_diario?: never
          dias_no_mes?: never
          mes?: number | null
          orcamento_mensal?: number | null
          orcamento_total_consolidado?: number | null
        }
        Relationships: []
      }
      vw_resumo_financeiro: {
        Row: {
          custo_por_mql: number | null
          custo_por_sal: number | null
          investido: number | null
          meta_receita_total: number | null
          pct_ticket: number | null
          roas: number | null
          ticket_medio_real: number | null
          valor_captado: number | null
        }
        Relationships: []
      }
      vw_resumo_financeiro_staging: {
        Row: {
          custo_por_mql: number | null
          custo_por_sal: number | null
          investido: number | null
          roas: number | null
          ticket_medio_real: number | null
          valor_captado: number | null
        }
        Relationships: []
      }
      vw_tasks_projetos: {
        Row: {
          admin_only: boolean | null
          atualizado_em: string | null
          atualizado_por_nome: string | null
          cliente_id: string | null
          cliente_nome: string | null
          commits_ultimo_dia: number | null
          data_entrega_prevista: string | null
          data_inicio: string | null
          data_ultima_metrica: string | null
          erros_altos_abertos: number | null
          erros_criticos_abertos: number | null
          etapa: string | null
          github_repo: string | null
          id: string | null
          motivo_semaforo: string | null
          nome: string | null
          prioridade: string | null
          segmento_empresa: string | null
          segmento_projeto: string | null
          semaforo: string | null
          stack_tipo: string | null
          status_geral: string | null
          ultimo_check_em: string | null
          ultimo_commit_em: string | null
          ultimo_response_ms: number | null
          ultimo_status_code: number | null
          url_producao: string | null
          visivel: boolean | null
        }
        Insert: {
          admin_only?: boolean | null
          atualizado_em?: string | null
          atualizado_por_nome?: never
          cliente_id?: string | null
          cliente_nome?: never
          commits_ultimo_dia?: never
          data_entrega_prevista?: string | null
          data_inicio?: string | null
          data_ultima_metrica?: never
          erros_altos_abertos?: never
          erros_criticos_abertos?: never
          etapa?: string | null
          github_repo?: never
          id?: string | null
          motivo_semaforo?: never
          nome?: string | null
          prioridade?: string | null
          segmento_empresa?: never
          segmento_projeto?: string | null
          semaforo?: never
          stack_tipo?: never
          status_geral?: string | null
          ultimo_check_em?: never
          ultimo_commit_em?: never
          ultimo_response_ms?: never
          ultimo_status_code?: never
          url_producao?: never
          visivel?: boolean | null
        }
        Update: {
          admin_only?: boolean | null
          atualizado_em?: string | null
          atualizado_por_nome?: never
          cliente_id?: string | null
          cliente_nome?: never
          commits_ultimo_dia?: never
          data_entrega_prevista?: string | null
          data_inicio?: string | null
          data_ultima_metrica?: never
          erros_altos_abertos?: never
          erros_criticos_abertos?: never
          etapa?: string | null
          github_repo?: never
          id?: string | null
          motivo_semaforo?: never
          nome?: string | null
          prioridade?: string | null
          segmento_empresa?: never
          segmento_projeto?: string | null
          semaforo?: never
          stack_tipo?: never
          status_geral?: string | null
          ultimo_check_em?: never
          ultimo_commit_em?: never
          ultimo_response_ms?: never
          ultimo_status_code?: never
          url_producao?: never
          visivel?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "contacts_full"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_timeline_projetos: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
          data_entrega_prevista: string | null
          data_entrega_real: string | null
          data_inicio: string | null
          dias_atraso: number | null
          etapa: string | null
          id: string | null
          is_aditivo: boolean | null
          nome: string | null
          prioridade: string | null
          segmento: string | null
          status_geral: string | null
          status_prazo: string | null
          tem_business_care: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_projetos"
            referencedColumns: ["cliente_id"]
          },
        ]
      }
    }
    Functions: {
      _merge_contact_into: {
        Args: { p_keeper: string; p_loser: string }
        Returns: undefined
      }
      alert_silent_mqls: { Args: never; Returns: number }
      can_see_all_calendar: { Args: never; Returns: boolean }
      claim_due_enrollments: {
        Args: { p_limit?: number }
        Returns: {
          cancelled_at: string | null
          cancelled_reason: string | null
          completed_at: string | null
          contact_id: string
          current_step: number | null
          deal_id: string | null
          enrolled_at: string | null
          id: string
          last_step_run_at: string | null
          next_step_at: string | null
          status: string
          workflow_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "workflow_enrollments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_queued_email_sends: {
        Args: { p_limit?: number }
        Returns: {
          bounce_type: string | null
          bounced_at: string | null
          campaign_id: string | null
          click_count: number | null
          clicked_at: string | null
          contact_id: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          from_email: string | null
          id: string
          open_count: number | null
          opened_at: string | null
          replied_at: string | null
          scheduled_at: string | null
          sent_at: string | null
          spam_reported_at: string | null
          status: string
          subject_rendered: string | null
          template_id: string | null
          to_email: string | null
          unsubscribed_at: string | null
          workflow_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "email_sends"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_whatsapp_outbound: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          contact_id: string | null
          conversation_id: string | null
          created_at: string
          deal_id: string | null
          id: string
          kind: string
          last_error: string | null
          payload: Json
          phone: string
          provider_used: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "whatsapp_outbound_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      classify_traffic_origin: {
        Args: { p_medium: string; p_referrer: string; p_source: string }
        Returns: string
      }
      collect_campaign_send_responses: {
        Args: { p_batch_size?: number }
        Returns: Json
      }
      create_secret: {
        Args: { new_secret: string; secret_name: string }
        Returns: undefined
      }
      dashboard_sdr_aguardando: {
        Args: { _user_id?: string }
        Returns: {
          contact_name: string
          conversation_id: string
          deal_id: string
          minutes_aguardando: number
          owner_state: string
          owner_state_changed_at: string
          product: string
          qualification_status: string
        }[]
      }
      dashboard_sdr_custos_api: {
        Args: { _end_date: string; _start_date: string; _user_id?: string }
        Returns: {
          custo_brl_estimado: number
          custo_usd_estimado: number
          total_msgs_bot: number
        }[]
      }
      dashboard_sdr_distribuicao_hora: {
        Args: { _end_date: string; _start_date: string; _user_id?: string }
        Returns: {
          hora: number
          total_msgs_lead: number
        }[]
      }
      dashboard_sdr_distribuicao_motivo: {
        Args: {
          _end_date: string
          _product?: string
          _start_date: string
          _user_id?: string
        }
        Returns: {
          motivo: string
          total: number
        }[]
      }
      dashboard_sdr_funil: {
        Args: { _end_date: string; _start_date: string; _user_id?: string }
        Returns: {
          product: string
          total_lead: number
          total_mql: number
          total_sql: number
          total_won: number
        }[]
      }
      dashboard_sdr_kpis: {
        Args: {
          _end_date: string
          _product?: string
          _start_date: string
          _user_id?: string
        }
        Returns: {
          conversion_rate: number
          total_leads: number
          total_mql: number
          total_sql: number
          total_won: number
        }[]
      }
      dashboard_sdr_stalled: {
        Args: { _end_date: string; _start_date: string; _user_id?: string }
        Returns: {
          bot_notes: Json
          closed_at: string
          closed_reason: string
          contact_name: string
          conversation_id: string
          deal_id: string
          product: string
        }[]
      }
      detect_cadence_no_response: { Args: never; Returns: undefined }
      enroll_contact_in_workflow: {
        Args: { p_contact_id: string; p_workflow_id: string }
        Returns: string
      }
      enroll_form_submission_workflows: {
        Args: { p_contact_id: string; p_form_slug: string }
        Returns: number
      }
      enroll_list_in_workflow: {
        Args: { p_list_id: string; p_workflow_id: string }
        Returns: number
      }
      enroll_unqualified_leads_nurture: { Args: never; Returns: number }
      finalize_campaign_if_done: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      find_contact_by_normalized_phone: {
        Args: { p_digits: string }
        Returns: {
          area_atuacao: string
          cargo: string
          company: string
          email: string
          faixa_de_faturamento: string
          first_name: string
          id: string
          is_internal_user: boolean
          last_name: string
          motivo_para_aprender_ia: string
          numero_de_liderados: string
          objetivo_com_a_comunidade: string
          phone: string
          produto_interesse: string
          renda_mensal: string
          whatsapp: string
        }[]
      }
      flag_deal_inconsistency: {
        Args: {
          p_conversation_value: string
          p_deal_id: string
          p_field: string
          p_form_value: string
          p_message_id?: string
        }
        Returns: string
      }
      fn_funil_por_origem: {
        Args: { p_since: string; p_until: string }
        Returns: {
          custo_etapa: number
          display_order: number
          entradas: number
          form_name: string
          form_origin: string
          gasto_origem: number
          is_lost: boolean
          is_won: boolean
          saidas: number
          stage_id: string
          stage_name: string
          tempo_medio_anterior_dias: number
        }[]
      }
      generate_system_notifications: {
        Args: never
        Returns: {
          created_count: number
        }[]
      }
      get_notion_token: { Args: never; Returns: string }
      get_or_create_active_conversation: {
        Args: {
          p_bot_disabled?: boolean
          p_contact_id: string
          p_default_source?: string
          p_default_state?: string
        }
        Returns: string
      }
      get_or_create_contact_by_phone: {
        Args: {
          p_first_name?: string
          p_fonte_registro?: string
          p_phone: string
        }
        Returns: {
          address: string | null
          area_atuacao: string | null
          avatar_fetched_at: string | null
          avatar_url: string | null
          cargo: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          deleted_at: string | null
          economia_mensal: number | null
          email: string | null
          email_2: string | null
          faixa_de_faturamento: string | null
          fbclid: string | null
          first_conversion: string | null
          first_conversion_date: string | null
          first_name: string
          fonte_registro: string | null
          gargalo_principal: string | null
          hubspot_id: number | null
          hubspot_owner: string | null
          id: string
          instagram_opt_in: boolean
          is_internal_user: boolean
          kind: string | null
          last_activity_at: string | null
          last_event_source_url: string | null
          last_fbc: string | null
          last_fbp: string | null
          last_ip_address: string | null
          last_name: string | null
          last_user_agent: string | null
          lead_score: number | null
          lead_status: string | null
          lead_tier: string | null
          lifecycle_stage: string | null
          linkedin_url: string | null
          manychat_id: string | null
          marketing_status: string | null
          motivo_para_aprender_ia: string | null
          notion_project_id: string | null
          numero_de_liderados: string | null
          objetivo_com_a_comunidade: string | null
          opted_out: boolean
          opted_out_at: string | null
          opted_out_reason: string | null
          origem_trafego: string | null
          owner_id: string | null
          phone: string | null
          phone_2: string | null
          produto_interesse: string[] | null
          renda_mensal: string | null
          state: string | null
          updated_at: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          website_url: string | null
          whatsapp: string | null
          whatsapp_2: string | null
          whatsapp_opt_in: boolean
          whatsapp_verified: boolean | null
          whatsapp_verified_at: string | null
          zip_code: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "contacts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_secret: { Args: { secret_name: string }; Returns: string }
      get_secrets: {
        Args: { secret_names: string[] }
        Returns: {
          name: string
          secret: string
        }[]
      }
      get_visible_deal_ids: { Args: { _user_id: string }; Returns: string[] }
      has_module_access:
        | {
            Args: {
              _min_permission?: Database["public"]["Enums"]["module_permission"]
              _module: Database["public"]["Enums"]["app_module"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              _min_permission?: Database["public"]["Enums"]["module_permission"]
              _module: Database["public"]["Enums"]["app_module"]
              _submodule?: string
              _user_id: string
            }
            Returns: boolean
          }
      has_permission: {
        Args: {
          _min_permission?: string
          _module: Database["public"]["Enums"]["app_module"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ig_poll_phase1: { Args: never; Returns: number }
      ig_poll_phase2: { Args: never; Returns: Json }
      increment_campaign_delivered: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      increment_replies_count: {
        Args: { automation_uuid: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      mads_error_is_transient: {
        Args: { p_meta: Json; p_msg: string; p_status: number }
        Returns: boolean
      }
      mads_f_ads_crm: {
        Args: { p_since: string; p_until: string }
        Returns: {
          ad_nome: string
          ad_set_id: string
          ad_uuid: string
          adset_nome: string
          campanha_nome: string
          cliques_link: number
          cpc_brl: number
          cpl_brl: number
          cpmql_brl: number
          cpsal_brl: number
          ctr_pct: number
          ganho: number
          gasto: number
          impressoes: number
          leads_crm: number
          leads_meta: number
          lp_views: number
          meta_ad_id: string
          mql: number
          produto: string
          sal: number
          status: string
          taxa_qualif_pct: number
        }[]
      }
      mads_f_criativos_metricas: {
        Args: { p_since: string; p_until: string }
        Returns: {
          ad_nome: string | null
          ad_status: string | null
          ad_uuid: string | null
          adset_nome: string | null
          alcance: number | null
          ate: string | null
          avg_time_sec: number | null
          body_rate_pct: number | null
          body_semaforo: string | null
          campanha_nome: string | null
          cliques_link: number | null
          cpl_brl: number | null
          cpmql_brl: number | null
          cpmql_semaforo: string | null
          cpsal_brl: number | null
          cpsal_semaforo: string | null
          ctr_real_pct: number | null
          ctr_semaforo: string | null
          cvr_pct: number | null
          cvr_semaforo: string | null
          desde: string | null
          diagnostico: string | null
          ganhos_no_crm: number | null
          gasto: number | null
          hook_rate_pct: number | null
          hook_semaforo: string | null
          impressoes: number | null
          leads: number | null
          leads_crm: number | null
          lp_views: number | null
          meta_ad_id: string | null
          meta_campaign_id: string | null
          mql_no_crm: number | null
          pipe_ativo: number | null
          retencao_75_pct: number | null
          retencao_semaforo: string | null
          sal_no_crm: number | null
          sql_no_crm: number | null
          taxa_qualificacao_pct: number | null
          valor_ganho_brl: number | null
          video_3s: number | null
          video_p100: number | null
          video_p25: number | null
          video_p50: number | null
          video_p75: number | null
          video_p95: number | null
          video_plays: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "mads_v_criativos_metricas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      mads_f_crm_por_ad: {
        Args: { p_since: string; p_until: string }
        Returns: {
          ad_uuid: string
          ganho: number
          leads_crm: number
          mql: number
          pipe_ativo: number
          sal: number
          sql_qualif: number
          valor_ganho_brl: number
        }[]
      }
      mads_f_lp_performance: {
        Args: { p_since: string; p_until: string }
        Returns: {
          gasto_meta: number
          id: string
          meta_lp_views: number
          mql: number
          submissions: number
          submissions_meta: number
        }[]
      }
      mads_f_lp_por_origem: {
        Args: { p_since: string; p_until: string }
        Returns: {
          cvr_organico: number
          cvr_pago: number
          cvr_total: number
          id: string
          leads_direct: number
          leads_organico: number
          leads_pago: number
          leads_referral: number
          leads_total: number
          pct_pago: number
          visits_direct: number
          visits_organico: number
          visits_pago: number
          visits_referral: number
          visits_total: number
        }[]
      }
      norm_email: { Args: { _e: string }; Returns: string }
      normalize_phone_br: { Args: { raw_phone: string }; Returns: string }
      poll_ig_comments: { Args: never; Returns: Json }
      preview_audience_count: { Args: { p_filters: Json }; Returns: number }
      preview_campaign_audience_count: {
        Args: { p_exclude_list_ids: string[]; p_include_list_ids: string[] }
        Returns: number
      }
      process_campaign_queue: { Args: { p_batch_size?: number }; Returns: Json }
      process_ig_comment: {
        Args: {
          p_comment_id: string
          p_comment_text: string
          p_media_id: string
          p_user_id: string
          p_username: string
        }
        Returns: Json
      }
      qualify_academy: { Args: { p_contact_id: string }; Returns: string }
      qualify_business: {
        Args: { p_contact_id: string; p_skip_cargo?: boolean }
        Returns: string
      }
      qualify_contact: {
        Args: {
          p_contact_id: string
          p_product: string
          p_skip_cargo?: boolean
        }
        Returns: string
      }
      queue_campaign_send: { Args: { p_campaign_id: string }; Returns: number }
      recalcular_metas_do_mes: {
        Args: {
          p_ano: number
          p_mes: number
          p_pipeline_id: string
          p_ticket_medio?: number
        }
        Returns: Json
      }
      resolve_audience_contact_ids: {
        Args: { p_filters: Json }
        Returns: string[]
      }
      resolve_contact_list_ids: {
        Args: { p_list_id: string }
        Returns: string[]
      }
      run_daily_meeting_analysis: { Args: never; Returns: undefined }
      set_meeting_status: {
        Args: { p_activity_id: string; p_status: string }
        Returns: undefined
      }
      set_reuniao_projeto_oculto: {
        Args: { p_activity_id: string; p_oculto: boolean }
        Returns: undefined
      }
      sync_campaign_counters: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      unaccent: { Args: { "": string }; Returns: string }
      update_secret: {
        Args: { new_secret: string; secret_name: string }
        Returns: undefined
      }
      upsert_dynamic_contact_list: {
        Args: {
          p_created_by?: string
          p_description: string
          p_filters: Json
          p_list_id?: string
          p_name: string
        }
        Returns: string
      }
    }
    Enums: {
      app_module:
        | "dashboard"
        | "pipeline"
        | "contacts"
        | "comercial"
        | "financeiro"
        | "analytics"
        | "email"
        | "forms"
        | "tasks"
        | "instagram"
        | "settings"
        | "admin"
        | "conteudo"
        | "atendimento"
        | "projetos"
        | "campanhas"
        | "estrategia_business"
        | "estrategia_academy"
        | "analytics_geral"
        | "analise_vendas"
        | "gestao_empresa"
      app_role: "ADMIN" | "LEADERSHIP" | "COMERCIAL"
      module_permission: "view" | "edit" | "none"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_module: [
        "dashboard",
        "pipeline",
        "contacts",
        "comercial",
        "financeiro",
        "analytics",
        "email",
        "forms",
        "tasks",
        "instagram",
        "settings",
        "admin",
        "conteudo",
        "atendimento",
        "projetos",
        "campanhas",
        "estrategia_business",
        "estrategia_academy",
        "analytics_geral",
        "analise_vendas",
        "gestao_empresa",
      ],
      app_role: ["ADMIN", "LEADERSHIP", "COMERCIAL"],
      module_permission: ["view", "edit", "none"],
    },
  },
} as const
