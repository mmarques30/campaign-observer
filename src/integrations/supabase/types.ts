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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
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
          read_count: number
          response_count: number
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
          read_count?: number
          response_count?: number
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
          read_count?: number
          response_count?: number
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
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "meta_templates"
            referencedColumns: ["id"]
          },
        ]
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
          cargo: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          deleted_at: string | null
          economia_mensal: number | null
          email: string | null
          faixa_de_faturamento: string | null
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
          last_activity_at: string | null
          last_name: string | null
          lead_score: number | null
          lead_status: string | null
          lead_tier: string | null
          lifecycle_stage: string | null
          linkedin_url: string | null
          manychat_id: string | null
          marketing_status: string | null
          motivo_para_aprender_ia: string | null
          numero_de_liderados: string | null
          objetivo_com_a_comunidade: string | null
          opted_out: boolean
          opted_out_at: string | null
          opted_out_reason: string | null
          owner_id: string | null
          phone: string | null
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
          whatsapp_opt_in: boolean
          whatsapp_verified: boolean | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          area_atuacao?: string | null
          cargo?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          economia_mensal?: number | null
          email?: string | null
          faixa_de_faturamento?: string | null
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
          last_activity_at?: string | null
          last_name?: string | null
          lead_score?: number | null
          lead_status?: string | null
          lead_tier?: string | null
          lifecycle_stage?: string | null
          linkedin_url?: string | null
          manychat_id?: string | null
          marketing_status?: string | null
          motivo_para_aprender_ia?: string | null
          numero_de_liderados?: string | null
          objetivo_com_a_comunidade?: string | null
          opted_out?: boolean
          opted_out_at?: string | null
          opted_out_reason?: string | null
          owner_id?: string | null
          phone?: string | null
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
          whatsapp_opt_in?: boolean
          whatsapp_verified?: boolean | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          area_atuacao?: string | null
          cargo?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          economia_mensal?: number | null
          email?: string | null
          faixa_de_faturamento?: string | null
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
          last_activity_at?: string | null
          last_name?: string | null
          lead_score?: number | null
          lead_status?: string | null
          lead_tier?: string | null
          lifecycle_stage?: string | null
          linkedin_url?: string | null
          manychat_id?: string | null
          marketing_status?: string | null
          motivo_para_aprender_ia?: string | null
          numero_de_liderados?: string | null
          objetivo_com_a_comunidade?: string | null
          opted_out?: boolean
          opted_out_at?: string | null
          opted_out_reason?: string | null
          owner_id?: string | null
          phone?: string | null
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
          whatsapp_opt_in?: boolean
          whatsapp_verified?: boolean | null
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
      deals: {
        Row: {
          amount: number | null
          assigned_to: string | null
          bot_inbound_origin: boolean | null
          canal_origem: string | null
          closed_at: string | null
          contact_id: string | null
          created_at: string | null
          faixa_faturamento: string | null
          first_seen_by_human_at: string | null
          form_origin: string | null
          hubspot_id: number | null
          id: string
          is_won: boolean | null
          lead_status: string | null
          motivo_perda: string | null
          name: string
          owner_id: string | null
          owner_state: string | null
          owner_state_changed_at: string | null
          pain_principal: string | null
          pipeline_id: string
          product: string
          qualification_status: string
          stage_entered_at: string | null
          stage_id: string
          ultimo_contato: string | null
          updated_at: string | null
          whatsapp_send_status: string | null
        }
        Insert: {
          amount?: number | null
          assigned_to?: string | null
          bot_inbound_origin?: boolean | null
          canal_origem?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          faixa_faturamento?: string | null
          first_seen_by_human_at?: string | null
          form_origin?: string | null
          hubspot_id?: number | null
          id?: string
          is_won?: boolean | null
          lead_status?: string | null
          motivo_perda?: string | null
          name: string
          owner_id?: string | null
          owner_state?: string | null
          owner_state_changed_at?: string | null
          pain_principal?: string | null
          pipeline_id: string
          product?: string
          qualification_status?: string
          stage_entered_at?: string | null
          stage_id: string
          ultimo_contato?: string | null
          updated_at?: string | null
          whatsapp_send_status?: string | null
        }
        Update: {
          amount?: number | null
          assigned_to?: string | null
          bot_inbound_origin?: boolean | null
          canal_origem?: string | null
          closed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          faixa_faturamento?: string | null
          first_seen_by_human_at?: string | null
          form_origin?: string | null
          hubspot_id?: number | null
          id?: string
          is_won?: boolean | null
          lead_status?: string | null
          motivo_perda?: string | null
          name?: string
          owner_id?: string | null
          owner_state?: string | null
          owner_state_changed_at?: string | null
          pain_principal?: string | null
          pipeline_id?: string
          product?: string
          qualification_status?: string
          stage_entered_at?: string | null
          stage_id?: string
          ultimo_contato?: string | null
          updated_at?: string | null
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
          form_id: string
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
          form_id: string
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
          form_id?: string
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
        ]
      }
      mads_lps: {
        Row: {
          ativa: boolean | null
          clarity_credential_id: string | null
          clarity_project_id: string | null
          created_at: string | null
          descricao: string | null
          form_slug: string | null
          id: string
          nome: string
          observacoes: string | null
          pixel_meta_detectado: boolean | null
          produto: string | null
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
          form_slug?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          pixel_meta_detectado?: boolean | null
          produto?: string | null
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
          form_slug?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          pixel_meta_detectado?: boolean | null
          produto?: string | null
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
          related_client: string | null
          related_contact_id: string | null
          related_deal_id: string | null
          related_produto: string | null
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
          related_client?: string | null
          related_contact_id?: string | null
          related_deal_id?: string | null
          related_produto?: string | null
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
          related_client?: string | null
          related_contact_id?: string | null
          related_deal_id?: string | null
          related_produto?: string | null
          source_key?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
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
        ]
      }
      parcelas: {
        Row: {
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string
          id: string
          numero: number
          status: string
          tipo: string
          valor: number
          venda_id: string
        }
        Insert: {
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          id?: string
          numero?: number
          status?: string
          tipo?: string
          valor?: number
          venda_id: string
        }
        Update: {
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          id?: string
          numero?: number
          status?: string
          tipo?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
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
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          notify_handoff_urgent: boolean
          notify_new_inbound: boolean
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
          notify_handoff_urgent?: boolean
          notify_new_inbound?: boolean
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
          notify_handoff_urgent?: boolean
          notify_new_inbound?: boolean
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
      vendas: {
        Row: {
          cep: string | null
          contact_id: string | null
          contrato_assinado: boolean | null
          contrato_assinado_em: string | null
          cpf_cnpj: string | null
          created_at: string | null
          data_envio_nf: string | null
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
          nome: string
          numero_nf: number | null
          observacoes_fiscais: string | null
          parcelas: number | null
          por_indicacao: boolean | null
          produto: string
          produto_venda: string | null
          razao_social: string | null
          status: string
          status_nf: string | null
          telefone: string | null
          telefone_fiscal: string | null
          total_parcelas: number | null
          valor: number
          valor_nf: number | null
        }
        Insert: {
          cep?: string | null
          contact_id?: string | null
          contrato_assinado?: boolean | null
          contrato_assinado_em?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_envio_nf?: string | null
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
          nome: string
          numero_nf?: number | null
          observacoes_fiscais?: string | null
          parcelas?: number | null
          por_indicacao?: boolean | null
          produto: string
          produto_venda?: string | null
          razao_social?: string | null
          status?: string
          status_nf?: string | null
          telefone?: string | null
          telefone_fiscal?: string | null
          total_parcelas?: number | null
          valor?: number
          valor_nf?: number | null
        }
        Update: {
          cep?: string | null
          contact_id?: string | null
          contrato_assinado?: boolean | null
          contrato_assinado_em?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_envio_nf?: string | null
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
          nome?: string
          numero_nf?: number | null
          observacoes_fiscais?: string | null
          parcelas?: number | null
          por_indicacao?: boolean | null
          produto?: string
          produto_venda?: string | null
          razao_social?: string | null
          status?: string
          status_nf?: string | null
          telefone?: string | null
          telefone_fiscal?: string | null
          total_parcelas?: number | null
          valor?: number
          valor_nf?: number | null
        }
        Relationships: [
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
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          bot_disabled: boolean
          bot_notes: Json | null
          bot_score: number | null
          classified_product: string | null
          closed_at: string | null
          closed_reason: string | null
          contact_id: string
          conversation_type: string
          created_at: string
          deal_id: string | null
          id: string
          inbound_provider: string
          last_inbound_at: string | null
          last_outbound_at: string | null
          origem_campaign_id: string | null
          product: string
          source: string
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
          contact_id: string
          conversation_type?: string
          created_at?: string
          deal_id?: string | null
          id?: string
          inbound_provider?: string
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          origem_campaign_id?: string | null
          product: string
          source?: string
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
          contact_id?: string
          conversation_type?: string
          created_at?: string
          deal_id?: string | null
          id?: string
          inbound_provider?: string
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          origem_campaign_id?: string | null
          product?: string
          source?: string
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
            foreignKeyName: "whatsapp_conversations_origem_campaign_id_fkey"
            columns: ["origem_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          body: string
          conversation_id: string
          delivery_status: string | null
          direction: string
          id: string
          metadata: Json | null
          provider: string
          send_error: string | null
          sender_type: string
          sender_user_id: string | null
          sent_at: string
          zapi_message_id: string | null
        }
        Insert: {
          body: string
          conversation_id: string
          delivery_status?: string | null
          direction: string
          id?: string
          metadata?: Json | null
          provider?: string
          send_error?: string | null
          sender_type: string
          sender_user_id?: string | null
          sent_at?: string
          zapi_message_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          delivery_status?: string | null
          direction?: string
          id?: string
          metadata?: Json | null
          provider?: string
          send_error?: string | null
          sender_type?: string
          sender_user_id?: string | null
          sent_at?: string
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
      workflow_enrollments: {
        Row: {
          completed_at: string | null
          contact_id: string
          current_step: number | null
          enrolled_at: string | null
          id: string
          next_step_at: string | null
          status: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          current_step?: number | null
          enrolled_at?: string | null
          id?: string
          next_step_at?: string | null
          status?: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          current_step?: number | null
          enrolled_at?: string | null
          id?: string
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
            foreignKeyName: "workflow_enrollments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "email_workflows"
            referencedColumns: ["id"]
          },
        ]
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
          hubspot_id: number | null
          id: string | null
          is_won: boolean | null
          lead_status: string | null
          motivo_perda: string | null
          name: string | null
          owner_id: string | null
          pipeline_id: string | null
          pipeline_name: string | null
          product: string | null
          qualification_status: string | null
          stage_entered_at: string | null
          stage_id: string | null
          stage_name: string | null
          stage_order: number | null
          stage_probability: number | null
          ultimo_contato: string | null
          updated_at: string | null
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
          status: string | null
          status_conexao: string | null
          taxa_conversao_crm_pct: number | null
          taxa_conversao_meta_pct: number | null
          tipo_lead: string | null
          utm_campaign: string | null
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
          status_conexao: string | null
          total_campanhas: number | null
        }
        Relationships: []
      }
      mads_v_lp_performance: {
        Row: {
          alerta: string | null
          ativa: boolean | null
          dead_clicks_30d: number | null
          engagement_seg_avg: number | null
          form_slug: string | null
          health_status: string | null
          id: string | null
          meta_lp_views_30d: number | null
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
    }
    Functions: {
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
      generate_system_notifications: {
        Args: never
        Returns: {
          created_count: number
        }[]
      }
      get_or_create_active_conversation: {
        Args: {
          p_bot_disabled?: boolean
          p_contact_id: string
          p_default_source?: string
          p_default_state?: string
        }
        Returns: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ig_poll_phase1: { Args: never; Returns: number }
      ig_poll_phase2: { Args: never; Returns: Json }
      increment_replies_count: {
        Args: { automation_uuid: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      poll_ig_comments: { Args: never; Returns: Json }
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
      qualify_business: { Args: { p_contact_id: string }; Returns: string }
      qualify_contact: {
        Args: { p_contact_id: string; p_product: string }
        Returns: string
      }
      qualify_skills: { Args: { p_contact_id: string }; Returns: string }
      sync_campaign_counters: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      unaccent: { Args: { "": string }; Returns: string }
      update_secret: {
        Args: { new_secret: string; secret_name: string }
        Returns: undefined
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
      ],
      app_role: ["ADMIN", "LEADERSHIP", "COMERCIAL"],
      module_permission: ["view", "edit", "none"],
    },
  },
} as const
