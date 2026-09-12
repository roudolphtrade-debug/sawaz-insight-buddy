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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          author_user_id: string | null
          body: string | null
          client_id: string
          collection_id: string | null
          created_at: string
          id: string
          submission_id: string | null
          title: string | null
          type: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_user_id?: string | null
          body?: string | null
          client_id: string
          collection_id?: string | null
          created_at?: string
          id?: string
          submission_id?: string | null
          title?: string | null
          type: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_user_id?: string | null
          body?: string | null
          client_id?: string
          collection_id?: string | null
          created_at?: string
          id?: string
          submission_id?: string | null
          title?: string | null
          type?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analyses_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          client_id: string
          collection_id: string
          created_at: string
          id: string
          not_found: boolean
          question_key: string
          submission_id: string
          value: Json | null
        }
        Insert: {
          client_id: string
          collection_id: string
          created_at?: string
          id?: string
          not_found?: boolean
          question_key: string
          submission_id: string
          value?: Json | null
        }
        Update: {
          client_id?: string
          collection_id?: string
          created_at?: string
          id?: string
          not_found?: boolean
          question_key?: string
          submission_id?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          client_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_hash: string | null
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          archived_at: string | null
          brand: Json
          created_at: string
          id: string
          is_demo: boolean
          name: string
          sector: string | null
          slug: string
          theme_tokens: Json
        }
        Insert: {
          archived_at?: string | null
          brand?: Json
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
          sector?: string | null
          slug: string
          theme_tokens?: Json
        }
        Update: {
          archived_at?: string | null
          brand?: Json
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
          sector?: string | null
          slug?: string
          theme_tokens?: Json
        }
        Relationships: []
      }
      collection_recipients: {
        Row: {
          client_id: string
          collection_id: string
          contact_id: string | null
          created_at: string
          id: string
        }
        Insert: {
          client_id: string
          collection_id: string
          contact_id?: string | null
          created_at?: string
          id?: string
        }
        Update: {
          client_id?: string
          collection_id?: string
          contact_id?: string | null
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_recipients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_recipients_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          client_id: string
          created_at: string
          id: string
          opened_at: string | null
          project_id: string | null
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          opened_at?: string | null
          project_id?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          opened_at?: string | null
          project_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          archived_at: string | null
          client_id: string
          created_at: string
          email: string
          id: string
          is_primary: boolean
          name: string
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          created_at?: string
          email: string
          id?: string
          is_primary?: boolean
          name: string
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          created_at?: string
          email?: string
          id?: string
          is_primary?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_metrics: {
        Row: {
          client_id: string
          confidence: number | null
          corrected_at: string | null
          corrected_by: string | null
          created_at: string
          id: string
          metric_key: string
          original_value_num: number | null
          original_value_text: string | null
          period_end: string | null
          period_start: string | null
          platform: string | null
          provenance: string
          review_note: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          source_file_id: string | null
          submission_id: string | null
          unit: string | null
          updated_at: string
          value_num: number | null
          value_text: string | null
        }
        Insert: {
          client_id: string
          confidence?: number | null
          corrected_at?: string | null
          corrected_by?: string | null
          created_at?: string
          id?: string
          metric_key: string
          original_value_num?: number | null
          original_value_text?: string | null
          period_end?: string | null
          period_start?: string | null
          platform?: string | null
          provenance?: string
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_file_id?: string | null
          submission_id?: string | null
          unit?: string | null
          updated_at?: string
          value_num?: number | null
          value_text?: string | null
        }
        Update: {
          client_id?: string
          confidence?: number | null
          corrected_at?: string | null
          corrected_by?: string | null
          created_at?: string
          id?: string
          metric_key?: string
          original_value_num?: number | null
          original_value_text?: string | null
          period_end?: string | null
          period_start?: string | null
          platform?: string | null
          provenance?: string
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_file_id?: string | null
          submission_id?: string | null
          unit?: string | null
          updated_at?: string
          value_num?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_metrics_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_metrics_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          client_id: string
          collection_id: string
          id: string
          mime: string | null
          original_name: string
          scan_status: string
          size_bytes: number | null
          slot_key: string
          storage_path: string
          submission_id: string
          uploaded_at: string
        }
        Insert: {
          client_id: string
          collection_id: string
          id?: string
          mime?: string | null
          original_name: string
          scan_status?: string
          size_bytes?: number | null
          slot_key: string
          storage_path: string
          submission_id: string
          uploaded_at?: string
        }
        Update: {
          client_id?: string
          collection_id?: string
          id?: string
          mime?: string | null
          original_name?: string
          scan_status?: string
          size_bytes?: number | null
          slot_key?: string
          storage_path?: string
          submission_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      link_sessions: {
        Row: {
          client_id: string
          created_at: string
          created_ip_hash: string | null
          expires_at: string
          id: string
          revoked_at: string | null
          secure_link_id: string
          session_token_hash: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_ip_hash?: string | null
          expires_at: string
          id?: string
          revoked_at?: string | null
          secure_link_id: string
          session_token_hash: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_ip_hash?: string | null
          expires_at?: string
          id?: string
          revoked_at?: string | null
          secure_link_id?: string
          session_token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_sessions_secure_link_id_fkey"
            columns: ["secure_link_id"]
            isOneToOne: false
            referencedRelation: "secure_links"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          attempts: number
          channel: string
          client_id: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          payload: Json
          recipient: string
          related_id: string | null
          related_type: string | null
          review_version_id: string | null
          sent_at: string | null
          status: string
          type: string
        }
        Insert: {
          attempts?: number
          channel?: string
          client_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          payload?: Json
          recipient: string
          related_id?: string | null
          related_type?: string | null
          review_version_id?: string | null
          sent_at?: string | null
          status?: string
          type: string
        }
        Update: {
          attempts?: number
          channel?: string
          client_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          payload?: Json
          recipient?: string
          related_id?: string | null
          related_type?: string | null
          review_version_id?: string | null
          sent_at?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_review_version_id_fkey"
            columns: ["review_version_id"]
            isOneToOne: false
            referencedRelation: "review_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          period_label: string | null
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          period_label?: string | null
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          period_label?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      review_versions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          charts: Json
          client_id: string
          content: Json
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          review_id: string
          status: string
          updated_at: string
          version_no: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          charts?: Json
          client_id: string
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          review_id: string
          status?: string
          updated_at?: string
          version_no: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          charts?: Json
          client_id?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          review_id?: string
          status?: string
          updated_at?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_versions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_versions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          client_id: string
          collection_id: string | null
          created_at: string
          current_version_id: string | null
          id: string
          project_id: string | null
          published_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          collection_id?: string | null
          created_at?: string
          current_version_id?: string | null
          id?: string
          project_id?: string | null
          published_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          collection_id?: string | null
          created_at?: string
          current_version_id?: string | null
          id?: string
          project_id?: string | null
          published_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      secure_links: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          last_used_at: string | null
          max_uses: number
          revoked_at: string | null
          scope: string
          target_id: string
          token_hash: string
          use_count: number
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          max_uses?: number
          revoked_at?: string | null
          scope: string
          target_id: string
          token_hash: string
          use_count?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_used_at?: string | null
          max_uses?: number
          revoked_at?: string | null
          scope?: string
          target_id?: string
          token_hash?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "secure_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          client_id: string
          collection_id: string
          created_at: string
          id: string
          snapshot: Json | null
          status: string
          submitted_at: string | null
          submitted_by_contact_id: string | null
          submitted_by_link_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          collection_id: string
          created_at?: string
          id?: string
          snapshot?: Json | null
          status?: string
          submitted_at?: string | null
          submitted_by_contact_id?: string | null
          submitted_by_link_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          collection_id?: string
          created_at?: string
          id?: string
          snapshot?: Json | null
          status?: string
          submitted_at?: string | null
          submitted_by_contact_id?: string | null
          submitted_by_link_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_submitted_by_contact_id_fkey"
            columns: ["submitted_by_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_submitted_by_link_id_fkey"
            columns: ["submitted_by_link_id"]
            isOneToOne: false
            referencedRelation: "secure_links"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_write: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "analyst" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["owner", "analyst", "viewer"],
    },
  },
} as const
