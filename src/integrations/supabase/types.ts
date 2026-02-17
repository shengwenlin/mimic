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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      courses: {
        Row: {
          id: string
          title: string
          description: string
          character_context: string
          owner_id: string | null
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          character_context?: string
          owner_id?: string | null
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          character_context?: string
          owner_id?: string | null
          is_system?: boolean
          created_at?: string
        }
        Relationships: []
      }
      lesson_sentences: {
        Row: {
          id: string
          lesson_id: string
          scene_description: string
          scene_title: string
          sentence_order: number
          translation: string
          words: string[]
        }
        Insert: {
          id?: string
          lesson_id: string
          scene_description?: string
          scene_title?: string
          sentence_order?: number
          translation: string
          words: string[]
        }
        Update: {
          id?: string
          lesson_id?: string
          scene_description?: string
          scene_title?: string
          sentence_order?: number
          translation?: string
          words?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "lesson_sentences_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          id: string
          lesson_order: number
          scene_description: string
          title: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_order?: number
          scene_description?: string
          title: string
          topic_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_order?: number
          scene_description?: string
          title?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      phrases: {
        Row: {
          chinese: string
          created_at: string
          english: string
          id: string
          sentence_id: string
          usage_tip: string | null
        }
        Insert: {
          chinese?: string
          created_at?: string
          english: string
          id?: string
          sentence_id: string
          usage_tip?: string | null
        }
        Update: {
          chinese?: string
          created_at?: string
          english?: string
          id?: string
          sentence_id?: string
          usage_tip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phrases_sentence_id_fkey"
            columns: ["sentence_id"]
            isOneToOne: false
            referencedRelation: "sentences"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      scene_progress: {
        Row: {
          avg_score: number
          completed_at: string | null
          created_at: string
          id: string
          scene_id: string
          user_id: string
        }
        Insert: {
          avg_score?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          scene_id: string
          user_id: string
        }
        Update: {
          avg_score?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          scene_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scene_progress_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          course_id: string | null
          created_at: string
          day: number
          duration_minutes: number
          id: string
          situation: string
          skill_tags: string[]
          title: string
          week: number
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          day?: number
          duration_minutes?: number
          id?: string
          situation?: string
          skill_tags?: string[]
          title: string
          week?: number
        }
        Update: {
          course_id?: string | null
          created_at?: string
          day?: number
          duration_minutes?: number
          id?: string
          situation?: string
          skill_tags?: string[]
          title?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "scenes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      sentences: {
        Row: {
          audio_url: string | null
          created_at: string
          id: string
          order_index: number
          phoneme_hints: string | null
          scene_id: string
          text: string
          translation: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: string
          order_index?: number
          phoneme_hints?: string | null
          scene_id: string
          text: string
          translation?: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: string
          order_index?: number
          phoneme_hints?: string | null
          scene_id?: string
          text?: string
          translation?: string
        }
        Relationships: [
          {
            foreignKeyName: "sentences_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          icon?: string
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          score: number
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          score?: number
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_vocab: {
        Row: {
          created_at: string
          id: string
          leitner_box: number
          next_review_date: string
          phrase_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          leitner_box?: number
          next_review_date?: string
          phrase_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          leitner_box?: number
          next_review_date?: string
          phrase_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vocab_phrase_id_fkey"
            columns: ["phrase_id"]
            isOneToOne: false
            referencedRelation: "phrases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
