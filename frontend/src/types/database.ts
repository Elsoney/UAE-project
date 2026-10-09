/**
 * Database types for the Umodai Supabase schema.
 *
 * GENERATED FILE — do not edit by hand. Regenerate after every migration:
 *   cd supabase && npm run gen:types
 * (Shape matches `supabase gen types typescript`; money columns are AED fils.)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string;
          full_name: string;
          is_active: boolean;
          role: Database["public"]["Enums"]["admin_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          full_name: string;
          is_active?: boolean;
          role: Database["public"]["Enums"]["admin_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["admin_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          actor: string | null;
          actor_role: string;
          after: Json | null;
          before: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
        };
        Insert: {
          action: string;
          actor?: string | null;
          actor_role: string;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: never;
        };
        Update: {
          action?: string;
          actor?: string | null;
          actor_role?: string;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: never;
        };
        Relationships: [];
      };
      blocked_dates: {
        Row: {
          blocked_on: string;
          created_at: string;
          created_by: string | null;
          id: string;
          reason: string | null;
        };
        Insert: {
          blocked_on: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          reason?: string | null;
        };
        Update: {
          blocked_on?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name_ar: string;
          name_en: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name_ar: string;
          name_en: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name_ar?: string;
          name_en?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      catering_packages: {
        Row: {
          base_price_fils: number;
          created_at: string;
          description_ar: string;
          description_en: string;
          id: string;
          image_path: string | null;
          included_items_ar: string[];
          included_items_en: string[];
          is_active: boolean;
          maximum_guests: number | null;
          minimum_guests: number;
          name_ar: string;
          name_en: string;
          price_per_guest_fils: number | null;
          slug: string;
          sort_order: number;
          terms_ar: string;
          terms_en: string;
          updated_at: string;
        };
        Insert: {
          base_price_fils: number;
          created_at?: string;
          description_ar?: string;
          description_en?: string;
          id?: string;
          image_path?: string | null;
          included_items_ar?: string[];
          included_items_en?: string[];
          is_active?: boolean;
          maximum_guests?: number | null;
          minimum_guests: number;
          name_ar: string;
          name_en: string;
          price_per_guest_fils?: number | null;
          slug: string;
          sort_order?: number;
          terms_ar?: string;
          terms_en?: string;
          updated_at?: string;
        };
        Update: {
          base_price_fils?: number;
          created_at?: string;
          description_ar?: string;
          description_en?: string;
          id?: string;
          image_path?: string | null;
          included_items_ar?: string[];
          included_items_en?: string[];
          is_active?: boolean;
          maximum_guests?: number | null;
          minimum_guests?: number;
          name_ar?: string;
          name_en?: string;
          price_per_guest_fils?: number | null;
          slug?: string;
          sort_order?: number;
          terms_ar?: string;
          terms_en?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      catering_requests: {
        Row: {
          admin_notes: string | null;
          cancellation_reason: string | null;
          confirmed_at: string | null;
          contact_email: string;
          contact_name: string;
          contact_phone: string;
          created_at: string;
          custom_request: string | null;
          customer_id: string;
          customer_notes: string | null;
          deposit_fixed_fils: number | null;
          deposit_percentage: number | null;
          deposit_type: Database["public"]["Enums"]["deposit_type"] | null;
          event_date: string;
          event_location: string;
          event_time: string;
          guest_count: number;
          id: string;
          idempotency_key: string | null;
          locale: Database["public"]["Enums"]["locale"];
          package_id: string | null;
          payment_status: Database["public"]["Enums"]["payment_status"];
          quoted_total_fils: number | null;
          reference: string;
          reviewed_by: string | null;
          source: Database["public"]["Enums"]["order_source"];
          status: Database["public"]["Enums"]["catering_status"];
          updated_at: string;
        };
        Insert: {
          admin_notes?: string | null;
          cancellation_reason?: string | null;
          confirmed_at?: string | null;
          contact_email: string;
          contact_name: string;
          contact_phone: string;
          created_at?: string;
          custom_request?: string | null;
          customer_id: string;
          customer_notes?: string | null;
          deposit_fixed_fils?: number | null;
          deposit_percentage?: number | null;
          deposit_type?: Database["public"]["Enums"]["deposit_type"] | null;
          event_date: string;
          event_location: string;
          event_time: string;
          guest_count: number;
          id?: string;
          idempotency_key?: string | null;
          locale?: Database["public"]["Enums"]["locale"];
          package_id?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          quoted_total_fils?: number | null;
          reference?: string;
          reviewed_by?: string | null;
          source?: Database["public"]["Enums"]["order_source"];
          status?: Database["public"]["Enums"]["catering_status"];
          updated_at?: string;
        };
        Update: {
          admin_notes?: string | null;
          cancellation_reason?: string | null;
          confirmed_at?: string | null;
          contact_email?: string;
          contact_name?: string;
          contact_phone?: string;
          created_at?: string;
          custom_request?: string | null;
          customer_id?: string;
          customer_notes?: string | null;
          deposit_fixed_fils?: number | null;
          deposit_percentage?: number | null;
          deposit_type?: Database["public"]["Enums"]["deposit_type"] | null;
          event_date?: string;
          event_location?: string;
          event_time?: string;
          guest_count?: number;
          id?: string;
          idempotency_key?: string | null;
          locale?: Database["public"]["Enums"]["locale"];
          package_id?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          quoted_total_fils?: number | null;
          reference?: string;
          reviewed_by?: string | null;
          source?: Database["public"]["Enums"]["order_source"];
          status?: Database["public"]["Enums"]["catering_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "catering_requests_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "catering_requests_package_id_fkey";
            columns: ["package_id"];
            isOneToOne: false;
            referencedRelation: "catering_packages";
            referencedColumns: ["id"];
          },
        ];
      };
      commission_settings: {
        Row: {
          approval_reference: string;
          basis: Database["public"]["Enums"]["commission_basis"];
          cancellation_treatment: string;
          created_at: string;
          created_by: string | null;
          effective_from: string;
          id: string;
          rate_percent: number;
          refund_treatment: string;
        };
        Insert: {
          approval_reference: string;
          basis: Database["public"]["Enums"]["commission_basis"];
          cancellation_treatment: string;
          created_at?: string;
          created_by?: string | null;
          effective_from: string;
          id?: string;
          rate_percent: number;
          refund_treatment: string;
        };
        Update: {
          approval_reference?: string;
          basis?: Database["public"]["Enums"]["commission_basis"];
          cancellation_treatment?: string;
          created_at?: string;
          created_by?: string | null;
          effective_from?: string;
          id?: string;
          rate_percent?: number;
          refund_treatment?: string;
        };
        Relationships: [];
      };
      commissions: {
        Row: {
          basis: Database["public"]["Enums"]["commission_basis"];
          calculated_at: string;
          catering_request_id: string | null;
          commission_amount_fils: number;
          eligible_amount_fils: number;
          id: string;
          inputs: Json;
          order_id: string | null;
          rate_percent: number;
          setting_id: string;
          status: Database["public"]["Enums"]["commission_status"];
          superseded_at: string | null;
          version: number;
        };
        Insert: {
          basis: Database["public"]["Enums"]["commission_basis"];
          calculated_at?: string;
          catering_request_id?: string | null;
          commission_amount_fils: number;
          eligible_amount_fils: number;
          id?: string;
          inputs: Json;
          order_id?: string | null;
          rate_percent: number;
          setting_id: string;
          status?: Database["public"]["Enums"]["commission_status"];
          superseded_at?: string | null;
          version: number;
        };
        Update: {
          basis?: Database["public"]["Enums"]["commission_basis"];
          calculated_at?: string;
          catering_request_id?: string | null;
          commission_amount_fils?: number;
          eligible_amount_fils?: number;
          id?: string;
          inputs?: Json;
          order_id?: string | null;
          rate_percent?: number;
          setting_id?: string;
          status?: Database["public"]["Enums"]["commission_status"];
          superseded_at?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "commissions_catering_request_id_fkey";
            columns: ["catering_request_id"];
            isOneToOne: true;
            referencedRelation: "catering_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commissions_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commissions_setting_id_fkey";
            columns: ["setting_id"];
            isOneToOne: false;
            referencedRelation: "commission_settings";
            referencedColumns: ["id"];
          },
        ];
      };
      consent_events: {
        Row: {
          consent_type: Database["public"]["Enums"]["consent_type"];
          created_at: string;
          customer_id: string;
          granted: boolean;
          id: number;
          locale: Database["public"]["Enums"]["locale"] | null;
          source: string;
        };
        Insert: {
          consent_type: Database["public"]["Enums"]["consent_type"];
          created_at?: string;
          customer_id: string;
          granted: boolean;
          id?: never;
          locale?: Database["public"]["Enums"]["locale"] | null;
          source: string;
        };
        Update: {
          consent_type?: Database["public"]["Enums"]["consent_type"];
          created_at?: string;
          customer_id?: string;
          granted?: boolean;
          id?: never;
          locale?: Database["public"]["Enums"]["locale"] | null;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "consent_events_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          auth_user_id: string | null;
          created_at: string;
          email: string;
          email_normalized: string | null;
          email_verified_at: string | null;
          full_name: string;
          id: string;
          marketing_consent: boolean;
          marketing_consent_at: string | null;
          marketing_consent_source: string | null;
          phone: string;
          preferred_language: Database["public"]["Enums"]["locale"];
          updated_at: string;
        };
        Insert: {
          auth_user_id?: string | null;
          created_at?: string;
          email: string;
          email_normalized?: never;
          email_verified_at?: string | null;
          full_name: string;
          id?: string;
          marketing_consent?: boolean;
          marketing_consent_at?: string | null;
          marketing_consent_source?: string | null;
          phone: string;
          preferred_language?: Database["public"]["Enums"]["locale"];
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string | null;
          created_at?: string;
          email?: string;
          email_normalized?: never;
          email_verified_at?: string | null;
          full_name?: string;
          id?: string;
          marketing_consent?: boolean;
          marketing_consent_at?: string | null;
          marketing_consent_source?: string | null;
          phone?: string;
          preferred_language?: Database["public"]["Enums"]["locale"];
          updated_at?: string;
        };
        Relationships: [];
      };
      email_outbox: {
        Row: {
          attempts: number;
          created_at: string;
          customer_id: string | null;
          dedupe_key: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          last_error: string | null;
          locale: Database["public"]["Enums"]["locale"];
          provider: string | null;
          provider_message_id: string | null;
          sent_at: string | null;
          status: Database["public"]["Enums"]["email_status"];
          subject: string;
          template: string;
          to_email: string;
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          customer_id?: string | null;
          dedupe_key?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          last_error?: string | null;
          locale: Database["public"]["Enums"]["locale"];
          provider?: string | null;
          provider_message_id?: string | null;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["email_status"];
          subject: string;
          template: string;
          to_email: string;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          customer_id?: string | null;
          dedupe_key?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          last_error?: string | null;
          locale?: Database["public"]["Enums"]["locale"];
          provider?: string | null;
          provider_message_id?: string | null;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["email_status"];
          subject?: string;
          template?: string;
          to_email?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_outbox_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_items: {
        Row: {
          category_id: string;
          created_at: string;
          description_ar: string;
          description_en: string;
          id: string;
          image_path: string | null;
          is_active: boolean;
          is_available: boolean;
          name_ar: string;
          name_en: string;
          price_fils: number;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          description_ar?: string;
          description_en?: string;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          is_available?: boolean;
          name_ar: string;
          name_en: string;
          price_fils: number;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          description_ar?: string;
          description_en?: string;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          is_available?: boolean;
          name_ar?: string;
          name_en?: string;
          price_fils?: number;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          menu_item_id: string;
          name_ar: string;
          name_en: string;
          order_id: string;
          quantity: number;
          total_price_fils: number;
          unit_price_fils: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          menu_item_id: string;
          name_ar: string;
          name_en: string;
          order_id: string;
          quantity: number;
          total_price_fils: number;
          unit_price_fils: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          menu_item_id?: string;
          name_ar?: string;
          name_en?: string;
          order_id?: string;
          quantity?: number;
          total_price_fils?: number;
          unit_price_fils?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          admin_notes: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          contact_email: string;
          contact_name: string;
          contact_phone: string;
          created_at: string;
          currency: string;
          customer_id: string;
          customer_notes: string | null;
          delivery_address: string | null;
          delivery_fee_fils: number;
          discount_fils: number;
          id: string;
          idempotency_key: string | null;
          locale: Database["public"]["Enums"]["locale"];
          order_status: Database["public"]["Enums"]["order_status"];
          order_type: Database["public"]["Enums"]["order_type"];
          payment_status: Database["public"]["Enums"]["payment_status"];
          reference: string;
          source: Database["public"]["Enums"]["order_source"];
          subtotal_fils: number;
          total_fils: number;
          updated_at: string;
        };
        Insert: {
          admin_notes?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          contact_email: string;
          contact_name: string;
          contact_phone: string;
          created_at?: string;
          currency?: string;
          customer_id: string;
          customer_notes?: string | null;
          delivery_address?: string | null;
          delivery_fee_fils?: number;
          discount_fils?: number;
          id?: string;
          idempotency_key?: string | null;
          locale?: Database["public"]["Enums"]["locale"];
          order_status?: Database["public"]["Enums"]["order_status"];
          order_type: Database["public"]["Enums"]["order_type"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          reference?: string;
          source?: Database["public"]["Enums"]["order_source"];
          subtotal_fils: number;
          total_fils: number;
          updated_at?: string;
        };
        Update: {
          admin_notes?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          contact_email?: string;
          contact_name?: string;
          contact_phone?: string;
          created_at?: string;
          currency?: string;
          customer_id?: string;
          customer_notes?: string | null;
          delivery_address?: string | null;
          delivery_fee_fils?: number;
          discount_fils?: number;
          id?: string;
          idempotency_key?: string | null;
          locale?: Database["public"]["Enums"]["locale"];
          order_status?: Database["public"]["Enums"]["order_status"];
          order_type?: Database["public"]["Enums"]["order_type"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          reference?: string;
          source?: Database["public"]["Enums"]["order_source"];
          subtotal_fils?: number;
          total_fils?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_events: {
        Row: {
          event_type: string;
          id: number;
          payload: Json;
          processed_at: string | null;
          processing_error: string | null;
          provider: string;
          provider_event_id: string;
          received_at: string;
          signature_verified: boolean;
        };
        Insert: {
          event_type: string;
          id?: never;
          payload: Json;
          processed_at?: string | null;
          processing_error?: string | null;
          provider: string;
          provider_event_id: string;
          received_at?: string;
          signature_verified: boolean;
        };
        Update: {
          event_type?: string;
          id?: never;
          payload?: Json;
          processed_at?: string | null;
          processing_error?: string | null;
          provider?: string;
          provider_event_id?: string;
          received_at?: string;
          signature_verified?: boolean;
        };
        Relationships: [];
      };
      payment_requests: {
        Row: {
          catering_request_id: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          deposit_type: Database["public"]["Enums"]["deposit_type"] | null;
          expires_at: string | null;
          fixed_amount_fils: number | null;
          id: string;
          is_test: boolean;
          kind: Database["public"]["Enums"]["payment_request_kind"];
          order_id: string | null;
          percentage: number | null;
          provider: string;
          provider_checkout_id: string | null;
          requested_amount_fils: number;
          status: Database["public"]["Enums"]["payment_request_status"];
          superseded_by: string | null;
          total_snapshot_fils: number;
          updated_at: string;
        };
        Insert: {
          catering_request_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          deposit_type?: Database["public"]["Enums"]["deposit_type"] | null;
          expires_at?: string | null;
          fixed_amount_fils?: number | null;
          id?: string;
          is_test: boolean;
          kind: Database["public"]["Enums"]["payment_request_kind"];
          order_id?: string | null;
          percentage?: number | null;
          provider: string;
          provider_checkout_id?: string | null;
          requested_amount_fils: number;
          status?: Database["public"]["Enums"]["payment_request_status"];
          superseded_by?: string | null;
          total_snapshot_fils: number;
          updated_at?: string;
        };
        Update: {
          catering_request_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          deposit_type?: Database["public"]["Enums"]["deposit_type"] | null;
          expires_at?: string | null;
          fixed_amount_fils?: number | null;
          id?: string;
          is_test?: boolean;
          kind?: Database["public"]["Enums"]["payment_request_kind"];
          order_id?: string | null;
          percentage?: number | null;
          provider?: string;
          provider_checkout_id?: string | null;
          requested_amount_fils?: number;
          status?: Database["public"]["Enums"]["payment_request_status"];
          superseded_by?: string | null;
          total_snapshot_fils?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_requests_catering_request_id_fkey";
            columns: ["catering_request_id"];
            isOneToOne: true;
            referencedRelation: "catering_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_requests_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_requests_superseded_by_fkey";
            columns: ["superseded_by"];
            isOneToOne: false;
            referencedRelation: "payment_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_fils: number;
          catering_request_id: string | null;
          created_at: string;
          currency: string;
          failure_reason: string | null;
          id: string;
          is_test: boolean;
          order_id: string | null;
          paid_at: string | null;
          payment_request_id: string | null;
          provider: string;
          provider_reference: string;
          raw_event: Json | null;
          status: Database["public"]["Enums"]["payment_txn_status"];
          updated_at: string;
        };
        Insert: {
          amount_fils: number;
          catering_request_id?: string | null;
          created_at?: string;
          currency?: string;
          failure_reason?: string | null;
          id?: string;
          is_test: boolean;
          order_id?: string | null;
          paid_at?: string | null;
          payment_request_id?: string | null;
          provider: string;
          provider_reference: string;
          raw_event?: Json | null;
          status?: Database["public"]["Enums"]["payment_txn_status"];
          updated_at?: string;
        };
        Update: {
          amount_fils?: number;
          catering_request_id?: string | null;
          created_at?: string;
          currency?: string;
          failure_reason?: string | null;
          id?: string;
          is_test?: boolean;
          order_id?: string | null;
          paid_at?: string | null;
          payment_request_id?: string | null;
          provider?: string;
          provider_reference?: string;
          raw_event?: Json | null;
          status?: Database["public"]["Enums"]["payment_txn_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_catering_request_id_fkey";
            columns: ["catering_request_id"];
            isOneToOne: false;
            referencedRelation: "catering_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_payment_request_id_fkey";
            columns: ["payment_request_id"];
            isOneToOne: false;
            referencedRelation: "payment_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      refunds: {
        Row: {
          amount_fils: number;
          created_at: string;
          created_by: string | null;
          currency: string;
          id: string;
          payment_id: string;
          provider_reference: string | null;
          reason: string;
          status: Database["public"]["Enums"]["refund_status"];
          updated_at: string;
        };
        Insert: {
          amount_fils: number;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          payment_id: string;
          provider_reference?: string | null;
          reason: string;
          status?: Database["public"]["Enums"]["refund_status"];
          updated_at?: string;
        };
        Update: {
          amount_fils?: number;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          id?: string;
          payment_id?: string;
          provider_reference?: string | null;
          reason?: string;
          status?: Database["public"]["Enums"]["refund_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      status_history: {
        Row: {
          changed_at: string;
          changed_by: string | null;
          entity_id: string;
          entity_type: string;
          field: string;
          id: number;
          new_value: string;
          note: string | null;
          old_value: string | null;
        };
        Insert: {
          changed_at?: string;
          changed_by?: string | null;
          entity_id: string;
          entity_type: string;
          field: string;
          id?: never;
          new_value: string;
          note?: string | null;
          old_value?: string | null;
        };
        Update: {
          changed_at?: string;
          changed_by?: string | null;
          entity_id?: string;
          entity_type?: string;
          field?: string;
          id?: never;
          new_value?: string;
          note?: string | null;
          old_value?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      commission_setting_at: {
        Args: { at_time: string };
        Returns: Database["public"]["Tables"]["commission_settings"]["Row"];
      };
      correct_source: {
        Args: { entity: string; entity_id: string; new_source: Database["public"]["Enums"]["order_source"]; reason: string };
        Returns: undefined;
      };
      current_admin_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["admin_role"];
      };
      get_blocked_dates: {
        Args: { from_date: string; to_date: string };
        Returns: string[];
      };
      has_admin_role: {
        Args: { required: Database["public"]["Enums"]["admin_role"] };
        Returns: boolean;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_valid_e164: {
        Args: { value: string };
        Returns: boolean;
      };
      is_valid_email: {
        Args: { value: string };
        Returns: boolean;
      };
    };
    Enums: {
      admin_role: "admin" | "operations_owner";
      catering_status: "pending_review" | "customer_contacted" | "quoted" | "awaiting_payment" | "confirmed" | "preparing" | "completed" | "rejected" | "cancelled";
      commission_basis: "gross" | "collected" | "net_of_refunds";
      commission_status: "pending" | "confirmed" | "void";
      consent_type: "marketing_email";
      deposit_type: "none" | "fixed" | "percentage" | "full";
      email_status: "queued" | "sending" | "sent" | "failed";
      locale: "ar" | "en";
      order_source: "website" | "phone" | "walk_in" | "other";
      order_status: "new" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";
      order_type: "pickup" | "delivery";
      payment_request_kind: "deposit" | "balance" | "full";
      payment_request_status: "pending" | "paid" | "expired" | "cancelled" | "failed" | "superseded";
      payment_status: "unpaid" | "payment_requested" | "deposit_paid" | "partially_paid" | "fully_paid" | "payment_failed" | "partially_refunded" | "refunded";
      payment_txn_status: "pending" | "succeeded" | "failed" | "cancelled";
      refund_status: "pending" | "succeeded" | "failed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      admin_role: ["admin", "operations_owner"],
      catering_status: ["pending_review", "customer_contacted", "quoted", "awaiting_payment", "confirmed", "preparing", "completed", "rejected", "cancelled"],
      commission_basis: ["gross", "collected", "net_of_refunds"],
      commission_status: ["pending", "confirmed", "void"],
      consent_type: ["marketing_email"],
      deposit_type: ["none", "fixed", "percentage", "full"],
      email_status: ["queued", "sending", "sent", "failed"],
      locale: ["ar", "en"],
      order_source: ["website", "phone", "walk_in", "other"],
      order_status: ["new", "confirmed", "preparing", "ready", "completed", "cancelled"],
      order_type: ["pickup", "delivery"],
      payment_request_kind: ["deposit", "balance", "full"],
      payment_request_status: ["pending", "paid", "expired", "cancelled", "failed", "superseded"],
      payment_status: ["unpaid", "payment_requested", "deposit_paid", "partially_paid", "fully_paid", "payment_failed", "partially_refunded", "refunded"],
      payment_txn_status: ["pending", "succeeded", "failed", "cancelled"],
      refund_status: ["pending", "succeeded", "failed"],
    },
  },
} as const;
