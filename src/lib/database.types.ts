// Hand-written to match supabase/migrations/ (0001_init, 0002_resources).
// Once a project is linked, regenerate with: supabase gen types typescript --linked > src/lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SongSource = 'musicbrainz' | 'custom';
export type SongStatus = 'want_to_learn' | 'learning' | 'learned' | 'shelved';
export type PracticeFeel = 'rough' | 'okay' | 'great';
export type ResourceKind = 'link' | 'file';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      songs: {
        Row: {
          id: string;
          mbid: string | null;
          title: string;
          artist: string;
          album: string | null;
          cover_url: string | null;
          cover_path: string | null;
          duration_ms: number | null;
          source: SongSource;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          mbid?: string | null;
          title: string;
          artist: string;
          album?: string | null;
          cover_url?: string | null;
          cover_path?: string | null;
          duration_ms?: number | null;
          source: SongSource;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          mbid?: string | null;
          title?: string;
          artist?: string;
          album?: string | null;
          cover_url?: string | null;
          cover_path?: string | null;
          duration_ms?: number | null;
          source?: SongSource;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_songs: {
        Row: {
          id: string;
          user_id: string;
          song_id: string;
          status: SongStatus;
          progress: number;
          difficulty: number | null;
          tuning: string | null;
          capo: number | null;
          notes: string | null;
          started_at: string | null;
          learned_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          song_id: string;
          status?: SongStatus;
          progress?: number;
          difficulty?: number | null;
          tuning?: string | null;
          capo?: number | null;
          notes?: string | null;
          started_at?: string | null;
          learned_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          song_id?: string;
          status?: SongStatus;
          progress?: number;
          difficulty?: number | null;
          tuning?: string | null;
          capo?: number | null;
          notes?: string | null;
          started_at?: string | null;
          learned_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_songs_song_id_fkey';
            columns: ['song_id'];
            isOneToOne: false;
            referencedRelation: 'songs';
            referencedColumns: ['id'];
          },
        ];
      };
      practice_sessions: {
        Row: {
          id: string;
          user_id: string;
          practiced_at: string;
          duration_sec: number;
          // Generated from duration_sec: whole minutes, at least 1.
          duration_min: number;
          feel: PracticeFeel | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          practiced_at?: string;
          duration_sec: number;
          duration_min?: never;
          feel?: PracticeFeel | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          practiced_at?: string;
          duration_sec?: number;
          duration_min?: never;
          feel?: PracticeFeel | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      practice_session_songs: {
        Row: {
          session_id: string;
          user_song_id: string;
          user_id: string;
        };
        Insert: {
          session_id: string;
          user_song_id: string;
          user_id?: string;
        };
        Update: {
          session_id?: string;
          user_song_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'practice_session_songs_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'practice_sessions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'practice_session_songs_user_song_id_fkey';
            columns: ['user_song_id'];
            isOneToOne: false;
            referencedRelation: 'user_songs';
            referencedColumns: ['id'];
          },
        ];
      };
      resources: {
        Row: {
          id: string;
          user_id: string;
          user_song_id: string;
          kind: ResourceKind;
          title: string;
          url: string | null;
          storage_path: string | null;
          mime_type: string | null;
          size_bytes: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          user_song_id: string;
          kind: ResourceKind;
          title: string;
          url?: string | null;
          storage_path?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          user_song_id?: string;
          kind?: ResourceKind;
          title?: string;
          url?: string | null;
          storage_path?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resources_user_song_id_fkey';
            columns: ['user_song_id'];
            isOneToOne: false;
            referencedRelation: 'user_songs';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      log_practice_session: {
        Args: {
          p_practiced_at: string;
          p_duration_sec: number;
          p_feel: PracticeFeel | null;
          p_user_song_ids: string[];
        };
        Returns: string;
      };
      add_musicbrainz_song: {
        Args: {
          p_mbid: string;
          p_title: string;
          p_artist: string;
          p_album?: string | null;
          p_cover_url?: string | null;
          p_duration_ms?: number | null;
        };
        Returns: string;
      };
    };
    Enums: {
      song_source: SongSource;
      song_status: SongStatus;
      practice_feel: PracticeFeel;
      resource_kind: ResourceKind;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database['public']['Tables'];
export type Tables<T extends keyof PublicTables> = PublicTables[T]['Row'];
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]['Insert'];
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]['Update'];
