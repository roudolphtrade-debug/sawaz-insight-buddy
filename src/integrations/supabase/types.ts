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
          type: Database["public"]["Enums"]["analysis_type"]
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
          type?: Database["public"]["Enums"]["analysis_type"]
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
          type?: Database["public"]["Enums"]["analysis_type"]
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
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
          is_optional: boolean
          not_found: boolean
          question_key: string
          submission_id: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          client_id: string
          collection_id: string
          created_at?: string
          id?: string
          is_optional?: boolean
          not_found?: boolean
          question_key: string
          submission_id: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          client_id?: string
          collection_id?: string
          created_at?: string
          id?: string
          is_optional?: boolean
          not_found?: boolean
          question_key?: string
          submission_id?: string
          updated_at?: string
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
          actor_type: Database["public"]["Enums"]["actor_type"]
          client_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_hash: string | null
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
        }
        Relationships: []
      }
      collection_recipients: {
        Row: {
          client_id: string
          collection_id: string
          contact_id: string
          created_at: string
          id: string
          notified_at: string | null
          secure_link_id: string | null
          status: Database["public"]["Enums"]["recipient_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          collection_id: string
          contact_id: string
          created_at?: string
          id?: string
          notified_at?: string | null
          secure_link_id?: string | null
          status?: Database["public"]["Enums"]["recipient_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          collection_id?: string
          contact_id?: string
          created_at?: string
          id?: string
          notified_at?: string | null
          secure_link_id?: string | null
          status?: Database["public"]["Enums"]["recipient_status"]
          updated_at?: string
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
          {
            foreignKeyName: "collection_recipients_secure_link_id_fkey"
            columns: ["secure_link_id"]
            isOneToOne: false
            referencedRelation: "secure_links"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_templates: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          published_at: string | null
          schema: Json
          updated_at: string
          version: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          schema?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          schema?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          archived_at: string | null
          client_id: string
          closed_at: string | null
          created_at: string
          id: string
          opened_at: string | null
          project_id: string
          status: Database["public"]["Enums"]["collection_status"]
          template_id: string | null
          template_version: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          closed_at?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["collection_status"]
          template_id?: string | null
          template_version?: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["collection_status"]
          template_id?: string | null
          template_version?: number
          updated_at?: string
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
          {
            foreignKeyName: "collections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "collection_templates"
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
          role_label: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          created_at?: string
          email: string
          id?: string
          is_primary?: boolean
          name: string
          role_label?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          created_at?: string
          email?: string
          id?: string
          is_primary?: boolean
          name?: string
          role_label?: string | null
          updated_at?: string
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
          collection_id: string
          confidence: number | null
          corrected_at: string | null
          corrected_by: string | null
          created_at: string
          extracted_at: string
          id: string
          metric_key: string
          original_value_num: number | null
          original_value_text: string | null
          period_end: string | null
          period_start: string | null
          platform: string | null
          provenance: Database["public"]["Enums"]["metric_provenance"]
          review_note: string | null
          review_status: Database["public"]["Enums"]["metric_review_status"]
          reviewed_at: string | null
          reviewed_by: string | null
          source_file_id: string | null
          submission_id: string
          unit: string | null
          updated_at: string
          value_num: number | null
          value_text: string | null
        }
        Insert: {
          client_id: string
          collection_id: string
          confidence?: number | null
          corrected_at?: string | null
          corrected_by?: string | null
          created_at?: string
          extracted_at?: string
          id?: string
          metric_key: string
          original_value_num?: number | null
          original_value_text?: string | null
          period_end?: string | null
          period_start?: string | null
          platform?: string | null
          provenance?: Database["public"]["Enums"]["metric_provenance"]
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["metric_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_file_id?: string | null
          submission_id: string
          unit?: string | null
          updated_at?: string
          value_num?: number | null
          value_text?: string | null
        }
        Update: {
          client_id?: string
          collection_id?: string
          confidence?: number | null
          corrected_at?: string | null
          corrected_by?: string | null
          created_at?: string
          extracted_at?: string
          id?: string
          metric_key?: string
          original_value_num?: number | null
          original_value_text?: string | null
          period_end?: string | null
          period_start?: string | null
          platform?: string | null
          provenance?: Database["public"]["Enums"]["metric_provenance"]
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["metric_review_status"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_file_id?: string | null
          submission_id?: string
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
            foreignKeyName: "extracted_metrics_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_metrics_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_metrics_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
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
          checksum: string | null
          client_id: string
          collection_id: string
          created_at: string
          id: string
          mime: string | null
          original_name: string
          scan_status: Database["public"]["Enums"]["file_scan_status"]
          size_bytes: number | null
          slot_key: string
          storage_path: string
          submission_id: string | null
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          checksum?: string | null
          client_id: string
          collection_id: string
          created_at?: string
          id?: string
          mime?: string | null
          original_name: string
          scan_status?: Database["public"]["Enums"]["file_scan_status"]
          size_bytes?: number | null
          slot_key: string
          storage_path: string
          submission_id?: string | null
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          checksum?: string | null
          client_id?: string
          collection_id?: string
          created_at?: string
          id?: string
          mime?: string | null
          original_name?: string
          scan_status?: Database["public"]["Enums"]["file_scan_status"]
          size_bytes?: number | null
          slot_key?: string
          storage_path?: string
          submission_id?: string | null
          updated_at?: string
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
          client_id: string
          created_at: string
          id: string
          idempotency_key: string
          payload: Json
          recipient: string
          related_id: string | null
          related_type: string | null
          review_version_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          type: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          channel?: string
          client_id: string
          created_at?: string
          id?: string
          idempotency_key: string
          payload?: Json
          recipient: string
          related_id?: string | null
          related_type?: string | null
          review_version_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          type: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          channel?: string
          client_id?: string
          created_at?: string
          id?: string
          idempotency_key?: string
          payload?: Json
          recipient?: string
          related_id?: string | null
          related_type?: string | null
          review_version_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          type?: string
          updated_at?: string
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
          archived_at: string | null
          client_id: string
          created_at: string
          id: string
          name: string
          period_label: string | null
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          created_at?: string
          id?: string
          name: string
          period_label?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          period_label?: string | null
          status?: string
          updated_at?: string
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
      rate_limits: {
        Row: {
          bucket: string
          created_at: string
          hits: number
          id: string
          subject_hash: string
          window_start: string
        }
        Insert: {
          bucket: string
          created_at?: string
          hits?: number
          id?: string
          subject_hash: string
          window_start: string
        }
        Update: {
          bucket?: string
          created_at?: string
          hits?: number
          id?: string
          subject_hash?: string
          window_start?: string
        }
        Relationships: []
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
          status: Database["public"]["Enums"]["review_status"]
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
          status?: Database["public"]["Enums"]["review_status"]
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
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "review_versions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_versions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
          archived_at: string | null
          client_id: string
          collection_id: string | null
          created_at: string
          current_version_id: string | null
          id: string
          project_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          collection_id?: string | null
          created_at?: string
          current_version_id?: string | null
          id?: string
          project_id: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          collection_id?: string | null
          created_at?: string
          current_version_id?: string | null
          id?: string
          project_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["review_status"]
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
            foreignKeyName: "reviews_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "review_versions"
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
          scope: Database["public"]["Enums"]["secure_link_scope"]
          target_id: string
          token_hash: string
          updated_at: string
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
          scope: Database["public"]["Enums"]["secure_link_scope"]
          target_id: string
          token_hash: string
          updated_at?: string
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
          scope?: Database["public"]["Enums"]["secure_link_scope"]
          target_id?: string
          token_hash?: string
          updated_at?: string
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
          {
            foreignKeyName: "secure_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
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
          status: Database["public"]["Enums"]["submission_status"]
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
          status?: Database["public"]["Enums"]["submission_status"]
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
          status?: Database["public"]["Enums"]["submission_status"]
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
            foreignKeyName: "submissions_link_fk"
            columns: ["submitted_by_link_id"]
            isOneToOne: false
            referencedRelation: "secure_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_submitted_by_contact_id_fkey"
            columns: ["submitted_by_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          email: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          email?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_clients: {
        Row: {
          client_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
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
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_write: { Args: never; Returns: boolean }
      can_write_client: { Args: { _client_id: string }; Returns: boolean }
      claim_team_access: { Args: never; Returns: string }
      consume_rate_limit: {
        Args: {
          _bucket: string
          _limit: number
          _subject: string
          _window_seconds: number
        }
        Returns: boolean
      }
      erase_client_data: {
        Args: { _client_id: string; _drop_client?: boolean }
        Returns: Json
      }
      has_client_access: { Args: { _client_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner: { Args: never; Returns: boolean }
      is_team_member: { Args: never; Returns: boolean }
      purge_audit_logs: { Args: { _keep_days?: number }; Returns: number }
      purge_expired_sessions: { Args: { _keep_days?: number }; Returns: number }
      purge_rate_limits: { Args: { _keep_hours?: number }; Returns: number }
    }
    Enums: {
      actor_type: "user" | "link" | "system"
      analysis_type: "constat" | "hypothese" | "recommandation" | "note"
      app_role: "owner" | "analyst" | "viewer"
      collection_status:
        | "draft"
        | "open"
        | "partially_submitted"
        | "submitted"
        | "closed"
      file_scan_status: "pending" | "clean" | "rejected"
      metric_provenance: "manual" | "csv" | "capture_ocr" | "derived"
      metric_review_status: "a_verifier" | "valide" | "rejete"
      notification_status: "queued" | "sent" | "failed"
      recipient_status: "pending" | "opened" | "submitted" | "bounced"
      review_status:
        | "draft"
        | "in_review"
        | "approved"
        | "published"
        | "archived"
      secure_link_scope: "collection" | "review"
      submission_status: "working" | "submitted"
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
      actor_type: ["user", "link", "system"],
      analysis_type: ["constat", "hypothese", "recommandation", "note"],
      app_role: ["owner", "analyst", "viewer"],
      collection_status: [
        "draft",
        "open",
        "partially_submitted",
        "submitted",
        "closed",
      ],
      file_scan_status: ["pending", "clean", "rejected"],
      metric_provenance: ["manual", "csv", "capture_ocr", "derived"],
      metric_review_status: ["a_verifier", "valide", "rejete"],
      notification_status: ["queued", "sent", "failed"],
      recipient_status: ["pending", "opened", "submitted", "bounced"],
      review_status: [
        "draft",
        "in_review",
        "approved",
        "published",
        "archived",
      ],
      secure_link_scope: ["collection", "review"],
      submission_status: ["working", "submitted"],
    },
  },
} as const
