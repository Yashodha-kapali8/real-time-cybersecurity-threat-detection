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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ml_models: {
        Row: {
          accuracy: number | null
          created_at: string
          f1_score: number | null
          id: string
          is_active: boolean | null
          model_path: string | null
          name: string
          precision_score: number | null
          recall_score: number | null
          training_date: string
          version: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          f1_score?: number | null
          id?: string
          is_active?: boolean | null
          model_path?: string | null
          name: string
          precision_score?: number | null
          recall_score?: number | null
          training_date?: string
          version: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          f1_score?: number | null
          id?: string
          is_active?: boolean | null
          model_path?: string | null
          name?: string
          precision_score?: number | null
          recall_score?: number | null
          training_date?: string
          version?: string
        }
        Relationships: []
      }
      network_traffic: {
        Row: {
          classification: string
          created_at: string
          destination_ip: string
          destination_port: number | null
          flags: string | null
          id: string
          ml_confidence: number | null
          packet_size: number
          protocol: string
          source_ip: string
          source_port: number | null
          timestamp: string
        }
        Insert: {
          classification?: string
          created_at?: string
          destination_ip: string
          destination_port?: number | null
          flags?: string | null
          id?: string
          ml_confidence?: number | null
          packet_size: number
          protocol: string
          source_ip: string
          source_port?: number | null
          timestamp?: string
        }
        Update: {
          classification?: string
          created_at?: string
          destination_ip?: string
          destination_port?: number | null
          flags?: string | null
          id?: string
          ml_confidence?: number | null
          packet_size?: number
          protocol?: string
          source_ip?: string
          source_port?: number | null
          timestamp?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          alert_email: string | null
          auto_refresh: boolean | null
          backup_schedule: string | null
          created_at: string
          dark_mode: boolean | null
          data_retention_days: number | null
          email_alerts: boolean | null
          id: string
          refresh_interval: number | null
          show_advanced_features: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          alert_email?: string | null
          auto_refresh?: boolean | null
          backup_schedule?: string | null
          created_at?: string
          dark_mode?: boolean | null
          data_retention_days?: number | null
          email_alerts?: boolean | null
          id?: string
          refresh_interval?: number | null
          show_advanced_features?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          alert_email?: string | null
          auto_refresh?: boolean | null
          backup_schedule?: string | null
          created_at?: string
          dark_mode?: boolean | null
          data_retention_days?: number | null
          email_alerts?: boolean | null
          id?: string
          refresh_interval?: number | null
          show_advanced_features?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      threat_logs: {
        Row: {
          confidence_score: number | null
          created_at: string
          description: string | null
          destination_ip: string | null
          id: string
          packet_size: number | null
          port: number | null
          protocol: string | null
          response_action: string | null
          severity: string
          source_ip: string
          status: string
          threat_type: string
          timestamp: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          destination_ip?: string | null
          id?: string
          packet_size?: number | null
          port?: number | null
          protocol?: string | null
          response_action?: string | null
          severity: string
          source_ip: string
          status?: string
          threat_type: string
          timestamp?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          destination_ip?: string | null
          id?: string
          packet_size?: number | null
          port?: number | null
          protocol?: string | null
          response_action?: string | null
          severity?: string
          source_ip?: string
          status?: string
          threat_type?: string
          timestamp?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "analyst" | "user"
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
      app_role: ["admin", "analyst", "user"],
    },
  },
} as const
