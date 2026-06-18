// Auto-generate with: npx supabase gen types typescript --local > lib/supabase/types.ts
// For now we use a minimal manual definition.

export type PlanId   = "free" | "starter" | "pro" | "business";
export type SubStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";
export type PaymentProvider = "stripe" | "mercadopago" | "paypal" | "khipu";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:                    string;
          email:                 string;
          display_name:          string | null;
          avatar_url:            string | null;
          plan:                  PlanId;
          sub_status:            SubStatus | null;
          sub_provider:          PaymentProvider | null;
          sub_provider_cust_id:  string | null;
          sub_provider_sub_id:   string | null;
          sub_current_period_end: string | null;
          voice_seconds_used:    number;
          notebook_theme:        NotebookTheme;
          created_at:            string;
          updated_at:            string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; email: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      notebooks: {
        Row: { id: string; user_id: string; name: string; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["notebooks"]["Row"]> & { user_id: string };
        Update: Partial<Database["public"]["Tables"]["notebooks"]["Row"]>;
      };
      notebook_pages: {
        Row: {
          id:          string;
          notebook_id: string;
          user_id:     string;
          page_number: number;
          strokes:     unknown[];
          created_at:  string;
          updated_at:  string;
        };
        Insert: Partial<Database["public"]["Tables"]["notebook_pages"]["Row"]> & {
          notebook_id: string; user_id: string; page_number: number;
        };
        Update: Partial<Database["public"]["Tables"]["notebook_pages"]["Row"]>;
      };
      voice_notes: {
        Row: {
          id:               string;
          user_id:          string;
          page_id:          string | null;
          storage_path:     string;
          duration_seconds: number;
          file_size_bytes:  number;
          label:            string | null;
          created_at:       string;
        };
        Insert: Partial<Database["public"]["Tables"]["voice_notes"]["Row"]> & {
          user_id: string; storage_path: string;
        };
        Update: Partial<Database["public"]["Tables"]["voice_notes"]["Row"]>;
      };
      subscriptions: {
        Row: {
          id:                   string;
          user_id:              string;
          provider:             PaymentProvider;
          provider_sub_id:      string;
          provider_customer_id: string | null;
          plan:                 PlanId;
          status:               SubStatus;
          current_period_start: string | null;
          current_period_end:   string | null;
          cancel_at_period_end: boolean;
          canceled_at:          string | null;
          created_at:           string;
          updated_at:           string;
        };
        Insert: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]> & {
          user_id: string; provider: PaymentProvider; provider_sub_id: string; plan: PlanId;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]>;
      };
      payment_events: {
        Row: {
          id:         string;
          provider:   PaymentProvider;
          event_id:   string | null;
          event_type: string;
          payload:    unknown;
          processed:  boolean;
          error:      string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payment_events"]["Row"]> & {
          provider: PaymentProvider; event_type: string; payload: unknown;
        };
        Update: Partial<Database["public"]["Tables"]["payment_events"]["Row"]>;
      };
    };
    Views:   Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      plan_id:          PlanId;
      sub_status:       SubStatus;
      payment_provider: PaymentProvider;
    };
  };
}

export interface NotebookTheme {
  background:   "ruled" | "grid" | "blank" | "dotted";
  bgColor:      string;
  lineColor:    string;
  marginColor:  string;
}
