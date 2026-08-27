// Generato da Supabase (mcp__Supabase__generate_typescript_types) — non modificare a mano.
// Rigenerare dopo ogni migrazione dello schema.
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
      accessi_documenti: {
        Row: {
          documento_id: string
          id: string
          nucleo_id: string
          quando: string
          user_id: string
        }
        Insert: {
          documento_id: string
          id?: string
          nucleo_id: string
          quando?: string
          user_id: string
        }
        Update: {
          documento_id?: string
          id?: string
          nucleo_id?: string
          quando?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessi_documenti_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessi_documenti_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nuclei"
            referencedColumns: ["id"]
          },
        ]
      }
      documenti: {
        Row: {
          caricato_il: string
          categoria: string
          data_scadenza: string | null
          id: string
          nota_curata: string | null
          nucleo_id: string
          persona_id: string | null
          pratica_id: string | null
          storage_path: string | null
          titolo: string
        }
        Insert: {
          caricato_il?: string
          categoria: string
          data_scadenza?: string | null
          id?: string
          nota_curata?: string | null
          nucleo_id: string
          persona_id?: string | null
          pratica_id?: string | null
          storage_path?: string | null
          titolo: string
        }
        Update: {
          caricato_il?: string
          categoria?: string
          data_scadenza?: string | null
          id?: string
          nota_curata?: string | null
          nucleo_id?: string
          persona_id?: string | null
          pratica_id?: string | null
          storage_path?: string | null
          titolo?: string
        }
        Relationships: [
          {
            foreignKeyName: "documenti_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nuclei"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documenti_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documenti_pratica_id_fkey"
            columns: ["pratica_id"]
            isOneToOne: false
            referencedRelation: "pratiche"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscale_aliquote: {
        Row: {
          aliquota_inps_gestione_separata: number
          aliquota_sostitutiva_agevolata: number
          aliquota_sostitutiva_standard: number
          anno: number
          massimale_inps: number
          minimale_inps: number
          note: string | null
          updated_at: string
        }
        Insert: {
          aliquota_inps_gestione_separata: number
          aliquota_sostitutiva_agevolata: number
          aliquota_sostitutiva_standard: number
          anno: number
          massimale_inps: number
          minimale_inps: number
          note?: string | null
          updated_at?: string
        }
        Update: {
          aliquota_inps_gestione_separata?: number
          aliquota_sostitutiva_agevolata?: number
          aliquota_sostitutiva_standard?: number
          anno?: number
          massimale_inps?: number
          minimale_inps?: number
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fiscale_incassi: {
        Row: {
          bollo_applicato: boolean
          cliente: string
          created_at: string
          data_emissione: string
          data_incasso: string | null
          descrizione: string | null
          id: string
          importo_netto: number
          note: string | null
          numero_fattura: string | null
          stato: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bollo_applicato?: boolean
          cliente: string
          created_at?: string
          data_emissione: string
          data_incasso?: string | null
          descrizione?: string | null
          id?: string
          importo_netto: number
          note?: string | null
          numero_fattura?: string | null
          stato?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bollo_applicato?: boolean
          cliente?: string
          created_at?: string
          data_emissione?: string
          data_incasso?: string | null
          descrizione?: string | null
          id?: string
          importo_netto?: number
          note?: string | null
          numero_fattura?: string | null
          stato?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fiscale_profilo: {
        Row: {
          agevolazione_5_percento: boolean | null
          codice_ateco: string
          coefficiente_redditivita: number
          created_at: string
          data_apertura: string | null
          note: string | null
          partita_iva: string | null
          regime: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agevolazione_5_percento?: boolean | null
          codice_ateco?: string
          coefficiente_redditivita?: number
          created_at?: string
          data_apertura?: string | null
          note?: string | null
          partita_iva?: string | null
          regime?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agevolazione_5_percento?: boolean | null
          codice_ateco?: string
          coefficiente_redditivita?: number
          created_at?: string
          data_apertura?: string | null
          note?: string | null
          partita_iva?: string | null
          regime?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fiscale_scadenze_stato: {
        Row: {
          chiave: string
          created_at: string
          data_pagamento: string | null
          id: string
          importo_pagato: number | null
          note: string | null
          pagato: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          chiave: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          importo_pagato?: number | null
          note?: string | null
          pagato?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          chiave?: string
          created_at?: string
          data_pagamento?: string | null
          id?: string
          importo_pagato?: number | null
          note?: string | null
          pagato?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fiscale_spese: {
        Row: {
          categoria: string | null
          created_at: string
          data: string
          descrizione: string
          id: string
          importo: number
          note: string | null
          user_id: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data: string
          descrizione: string
          id?: string
          importo: number
          note?: string | null
          user_id: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data?: string
          descrizione?: string
          id?: string
          importo?: number
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      membri_accesso: {
        Row: {
          nucleo_id: string
          persona_id: string | null
          ruolo: string
          user_id: string
        }
        Insert: {
          nucleo_id: string
          persona_id?: string | null
          ruolo: string
          user_id: string
        }
        Update: {
          nucleo_id?: string
          persona_id?: string | null
          ruolo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membri_accesso_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nuclei"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membri_accesso_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
        ]
      }
      nuclei: {
        Row: {
          creato_il: string
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          creato_il?: string
          id?: string
          nome: string
          tipo: string
        }
        Update: {
          creato_il?: string
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      persone: {
        Row: {
          creato_il: string
          id: string
          nome: string
          nota: string | null
          nucleo_id: string
        }
        Insert: {
          creato_il?: string
          id?: string
          nome: string
          nota?: string | null
          nucleo_id: string
        }
        Update: {
          creato_il?: string
          id?: string
          nome?: string
          nota?: string | null
          nucleo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "persone_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nuclei"
            referencedColumns: ["id"]
          },
        ]
      }
      piani_rate: {
        Row: {
          fonte: string
          id: string
          nota: string | null
          nucleo_id: string
          titolo: string
        }
        Insert: {
          fonte: string
          id?: string
          nota?: string | null
          nucleo_id: string
          titolo: string
        }
        Update: {
          fonte?: string
          id?: string
          nota?: string | null
          nucleo_id?: string
          titolo?: string
        }
        Relationships: [
          {
            foreignKeyName: "piani_rate_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nuclei"
            referencedColumns: ["id"]
          },
        ]
      }
      pratiche: {
        Row: {
          aperta_il: string
          chiusa_il: string | null
          id: string
          nota: string | null
          nucleo_id: string
          persona_id: string | null
          stato: string
          tipo: string
          titolo: string
        }
        Insert: {
          aperta_il?: string
          chiusa_il?: string | null
          id?: string
          nota?: string | null
          nucleo_id: string
          persona_id?: string | null
          stato?: string
          tipo: string
          titolo: string
        }
        Update: {
          aperta_il?: string
          chiusa_il?: string | null
          id?: string
          nota?: string | null
          nucleo_id?: string
          persona_id?: string | null
          stato?: string
          tipo?: string
          titolo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pratiche_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nuclei"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pratiche_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persone"
            referencedColumns: ["id"]
          },
        ]
      }
      pratiche_checklist: {
        Row: {
          documento_id: string | null
          id: string
          nucleo_id: string
          pratica_id: string
          ricevuto: boolean
          voce: string
        }
        Insert: {
          documento_id?: string | null
          id?: string
          nucleo_id: string
          pratica_id: string
          ricevuto?: boolean
          voce: string
        }
        Update: {
          documento_id?: string | null
          id?: string
          nucleo_id?: string
          pratica_id?: string
          ricevuto?: boolean
          voce?: string
        }
        Relationships: [
          {
            foreignKeyName: "pratiche_checklist_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documenti"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pratiche_checklist_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nuclei"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pratiche_checklist_pratica_id_fkey"
            columns: ["pratica_id"]
            isOneToOne: false
            referencedRelation: "pratiche"
            referencedColumns: ["id"]
          },
        ]
      }
      pratiche_eventi: {
        Row: {
          id: string
          nucleo_id: string
          pratica_id: string
          quando: string
          testo: string
        }
        Insert: {
          id?: string
          nucleo_id: string
          pratica_id: string
          quando?: string
          testo: string
        }
        Update: {
          id?: string
          nucleo_id?: string
          pratica_id?: string
          quando?: string
          testo?: string
        }
        Relationships: [
          {
            foreignKeyName: "pratiche_eventi_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nuclei"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pratiche_eventi_pratica_id_fkey"
            columns: ["pratica_id"]
            isOneToOne: false
            referencedRelation: "pratiche"
            referencedColumns: ["id"]
          },
        ]
      }
      rate: {
        Row: {
          id: string
          importo_cent: number | null
          nucleo_id: string
          numero: number
          pagata: boolean
          piano_id: string
          scadenza: string
        }
        Insert: {
          id?: string
          importo_cent?: number | null
          nucleo_id: string
          numero: number
          pagata?: boolean
          piano_id: string
          scadenza: string
        }
        Update: {
          id?: string
          importo_cent?: number | null
          nucleo_id?: string
          numero?: number
          pagata?: boolean
          piano_id?: string
          scadenza?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nuclei"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_piano_id_fkey"
            columns: ["piano_id"]
            isOneToOne: false
            referencedRelation: "piani_rate"
            referencedColumns: ["id"]
          },
        ]
      }
      scadenze: {
        Row: {
          data: string
          fonte: string
          id: string
          nucleo_id: string
          promemoria_inviato_il: string | null
          riferimento_id: string | null
          titolo: string
        }
        Insert: {
          data: string
          fonte: string
          id?: string
          nucleo_id: string
          promemoria_inviato_il?: string | null
          riferimento_id?: string | null
          titolo: string
        }
        Update: {
          data?: string
          fonte?: string
          id?: string
          nucleo_id?: string
          promemoria_inviato_il?: string | null
          riferimento_id?: string | null
          titolo?: string
        }
        Relationships: [
          {
            foreignKeyName: "scadenze_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nuclei"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          nome: string
          user_id: string
        }
        Insert: {
          nome: string
          user_id: string
        }
        Update: {
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      miei_nuclei: { Args: never; Returns: string[] }
      posso_vedere: {
        Args: { riga_nucleo: string; riga_persona: string }
        Returns: boolean
      }
      sono_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
