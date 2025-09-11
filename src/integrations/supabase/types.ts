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
      boards: {
        Row: {
          "Board Name": string
          "Coding Language": string | null
          "Cost (/-)": string | null
          created_at: string | null
          id: number
          Info: string | null
          Tips: string | null
          "Uses (how and where)": string | null
        }
        Insert: {
          "Board Name": string
          "Coding Language"?: string | null
          "Cost (/-)"?: string | null
          created_at?: string | null
          id?: never
          Info?: string | null
          Tips?: string | null
          "Uses (how and where)"?: string | null
        }
        Update: {
          "Board Name"?: string
          "Coding Language"?: string | null
          "Cost (/-)"?: string | null
          created_at?: string | null
          id?: never
          Info?: string | null
          Tips?: string | null
          "Uses (how and where)"?: string | null
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          like_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          like_type: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          like_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string
          dislikes: number
          id: string
          likes: number
          parent_id: string | null
          post_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dislikes?: number
          id?: string
          likes?: number
          parent_id?: string | null
          post_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          dislikes?: number
          id?: string
          likes?: number
          parent_id?: string | null
          post_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      components: {
        Row: {
          "Component Name": string
          created_at: string | null
          "How to Identify": string | null
          "How to Measure": string | null
          "How to Use": string | null
          id: number
          "Safety Tips": string | null
          Uses: string | null
        }
        Insert: {
          "Component Name": string
          created_at?: string | null
          "How to Identify"?: string | null
          "How to Measure"?: string | null
          "How to Use"?: string | null
          id?: never
          "Safety Tips"?: string | null
          Uses?: string | null
        }
        Update: {
          "Component Name"?: string
          created_at?: string | null
          "How to Identify"?: string | null
          "How to Measure"?: string | null
          "How to Use"?: string | null
          id?: never
          "Safety Tips"?: string | null
          Uses?: string | null
        }
        Relationships: []
      }
      devices: {
        Row: {
          created_at: string | null
          DEVICE: string
          "ESTIMATED REPAIR COST": string | null
          "FIX STEPS": string | null
          id: number
          "PROBLEM DIAGNOSIS": string | null
          REASON: string | null
          SYMPTOMS: string | null
          TIP: string | null
          "TOOLS NEEDED": string | null
        }
        Insert: {
          created_at?: string | null
          DEVICE: string
          "ESTIMATED REPAIR COST"?: string | null
          "FIX STEPS"?: string | null
          id?: never
          "PROBLEM DIAGNOSIS"?: string | null
          REASON?: string | null
          SYMPTOMS?: string | null
          TIP?: string | null
          "TOOLS NEEDED"?: string | null
        }
        Update: {
          created_at?: string | null
          DEVICE?: string
          "ESTIMATED REPAIR COST"?: string | null
          "FIX STEPS"?: string | null
          id?: never
          "PROBLEM DIAGNOSIS"?: string | null
          REASON?: string | null
          SYMPTOMS?: string | null
          TIP?: string | null
          "TOOLS NEEDED"?: string | null
        }
        Relationships: []
      }
      diagnostic_sessions: {
        Row: {
          ai_analysis: Json | null
          backup_search_results: Json | null
          created_at: string
          database_matches: Json | null
          device_category: string | null
          id: string
          image_urls: string[] | null
          repair_guidance: Json | null
          status: string | null
          symptoms_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          backup_search_results?: Json | null
          created_at?: string
          database_matches?: Json | null
          device_category?: string | null
          id?: string
          image_urls?: string[] | null
          repair_guidance?: Json | null
          status?: string | null
          symptoms_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          backup_search_results?: Json | null
          created_at?: string
          database_matches?: Json | null
          device_category?: string | null
          id?: string
          image_urls?: string[] | null
          repair_guidance?: Json | null
          status?: string | null
          symptoms_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      function_usage: {
        Row: {
          count: number
          created_at: string
          function_name: string
          id: string
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string
          function_name: string
          id?: string
          user_id: string
          window_start: string
        }
        Update: {
          count?: number
          created_at?: string
          function_name?: string
          id?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      history: {
        Row: {
          action: string
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      instruments: {
        Row: {
          created_at: string | null
          Device: string
          "Estimated Repair Cost (â‚¹)": string | null
          "Fix Steps": string | null
          id: number
          "Problem Diagnosis": string | null
          Reasons: string | null
          Symptoms: string | null
          Tip: string | null
          "Tools Needed": string | null
        }
        Insert: {
          created_at?: string | null
          Device: string
          "Estimated Repair Cost (â‚¹)"?: string | null
          "Fix Steps"?: string | null
          id?: never
          "Problem Diagnosis"?: string | null
          Reasons?: string | null
          Symptoms?: string | null
          Tip?: string | null
          "Tools Needed"?: string | null
        }
        Update: {
          created_at?: string | null
          Device?: string
          "Estimated Repair Cost (â‚¹)"?: string | null
          "Fix Steps"?: string | null
          id?: never
          "Problem Diagnosis"?: string | null
          Reasons?: string | null
          Symptoms?: string | null
          Tip?: string | null
          "Tools Needed"?: string | null
        }
        Relationships: []
      }
      pcbs: {
        Row: {
          created_at: string | null
          Explanation: string | null
          id: number
          Problem: string
          Solution: string | null
          Tip: string | null
          Tools: string | null
        }
        Insert: {
          created_at?: string | null
          Explanation?: string | null
          id?: never
          Problem: string
          Solution?: string | null
          Tip?: string | null
          Tools?: string | null
        }
        Update: {
          created_at?: string | null
          Explanation?: string | null
          id?: never
          Problem?: string
          Solution?: string | null
          Tip?: string | null
          Tools?: string | null
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          like_type: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          like_type: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          like_type?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          created_at: string
          dislikes: number
          id: string
          image_url: string | null
          likes: number
          text: string
          user_id: string
          views: number
        }
        Insert: {
          created_at?: string
          dislikes?: number
          id?: string
          image_url?: string | null
          likes?: number
          text: string
          user_id: string
          views?: number
        }
        Update: {
          created_at?: string
          dislikes?: number
          id?: string
          image_url?: string | null
          likes?: number
          text?: string
          user_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          daily_scans: number | null
          email: string | null
          id: string
          ispremium: boolean | null
          last_scan_date: string | null
          lastscanreset: string | null
          premiumuienabled: boolean | null
          remainingscans: number | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          daily_scans?: number | null
          email?: string | null
          id?: string
          ispremium?: boolean | null
          last_scan_date?: string | null
          lastscanreset?: string | null
          premiumuienabled?: boolean | null
          remainingscans?: number | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          daily_scans?: number | null
          email?: string | null
          id?: string
          ispremium?: boolean | null
          last_scan_date?: string | null
          lastscanreset?: string | null
          premiumuienabled?: boolean | null
          remainingscans?: number | null
          username?: string
        }
        Relationships: []
      }
      scans: {
        Row: {
          created_at: string
          device_name: string
          id: string
          result: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name: string
          id?: string
          result: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string
          id?: string
          result?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
