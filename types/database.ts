/**
 * TypeScript types matching our Supabase schema.
 *
 * Hand-written for now. Later we can replace with:
 *   npx supabase gen types typescript --project-id <ref> > types/database.ts
 *
 * If you change the schema in 01_schema.sql, update this file to match.
 */

export type Sport = "baseball" | "basketball" | "football" | "hockey" | "soccer";
export type BreakFormat = "random_team" | "pyt";
export type BreakStatus = "planned" | "in_progress" | "completed" | "canceled";
export type UserRole = "owner" | "admin" | "member";
export type SubscriptionTier = "starter" | "pro" | "business" | "standalone";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";
export type UsernamePlatform =
  | "whatnot"
  | "fanatics_live"
  | "discord"
  | "ebay"
  | "instagram"
  | "twitter"
  | "other";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          branding_config: Json;
          subscription_tier: SubscriptionTier;
          subscription_status: SubscriptionStatus;
          trial_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          branding_config?: Json;
          subscription_tier?: SubscriptionTier;
          subscription_status?: SubscriptionStatus;
          trial_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
      };
      profiles: {
        Row: {
          id: string;
          org_id: string;
          role: UserRole;
          display_name: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          role?: UserRole;
          display_name?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      teams: {
        Row: {
          id: string;
          sport: Sport;
          league: string;
          name: string;
          abbreviation: string | null;
          display_order: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sport: Sport;
          league: string;
          name: string;
          abbreviation?: string | null;
          display_order?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
      };
      customers: {
        Row: {
          id: string;
          org_id: string;
          display_name: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          display_name: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      customer_usernames: {
        Row: {
          id: string;
          customer_id: string;
          platform: UsernamePlatform;
          username: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          platform: UsernamePlatform;
          username: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customer_usernames"]["Insert"]>;
      };
      breaks: {
        Row: {
          id: string;
          org_id: string;
          product_name: string;
          product_year: number | null;
          sport: Sport;
          league: string | null;
          format: BreakFormat;
          spots_per_buyer: number;
          box_cost: number | null;
          total_product_cost: number;
          box_count: number;
          status: BreakStatus;
          break_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          product_name: string;
          product_year?: number | null;
          sport: Sport;
          league?: string | null;
          format: BreakFormat;
          spots_per_buyer?: number;
          box_cost?: number | null;
          total_product_cost?: number;
          box_count?: number;
          status?: BreakStatus;
          break_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["breaks"]["Insert"]>;
      };
      break_spots: {
        Row: {
          id: string;
          break_id: string;
          spot_number: number;
          customer_id: string | null;
          price: number | null;
          shipping_cost: number;
          supplies_cost: number;
          fees_cost: number;
          payment_received: boolean;
          shipped: boolean;
          shipped_at: string | null;
          tracking_number: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          break_id: string;
          spot_number: number;
          customer_id?: string | null;
          price?: number | null;
          shipping_cost?: number;
          supplies_cost?: number;
          fees_cost?: number;
          payment_received?: boolean;
          shipped?: boolean;
          shipped_at?: string | null;
          tracking_number?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["break_spots"]["Insert"]>;
      };
      break_spot_teams: {
        Row: {
          id: string;
          break_spot_id: string;
          team_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          break_spot_id: string;
          team_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["break_spot_teams"]["Insert"]>;
      };
    };
    Views: {
      break_pnl: {
        Row: {
          break_id: string;
          org_id: string;
          product_name: string;
          total_product_cost: number;
          total_revenue: number;
          total_additional_costs: number;
          gross_profit: number;
          net_profit: number;
          total_spots: number;
          sold_spots: number;
        };
      };
      customer_stats: {
        Row: {
          customer_id: string;
          org_id: string;
          display_name: string;
          lifetime_spend: number;
          total_breaks: number;
          total_spots_purchased: number;
          last_purchase_date: string | null;
        };
      };
    };
    Functions: {
      create_organization_and_profile: {
        Args: {
          org_name: string;
          org_slug: string;
          user_display_name: string;
        };
        Returns: string;
      };
      user_org_id: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
  };
}
