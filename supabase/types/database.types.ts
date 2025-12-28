// Generated from migrations snapshot. Update alongside Supabase schema changes.
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
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
        };
        Update: {
          username?: string;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          theme: string | null;
          board_style: string | null;
          piece_style: string | null;
          sound: boolean | null;
          notation: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          theme?: string | null;
          board_style?: string | null;
          piece_style?: string | null;
          sound?: boolean | null;
          notation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          theme?: string | null;
          board_style?: string | null;
          piece_style?: string | null;
          sound?: boolean | null;
          notation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      simuls: {
        Row: {
          id: string;
          host_id: string;
          name: string;
          status: 'draft' | 'open' | 'running' | 'finished';
          time_control: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          host_id: string;
          name: string;
          status?: 'draft' | 'open' | 'running' | 'finished';
          time_control?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          host_id?: string;
          name?: string;
          status?: 'draft' | 'open' | 'running' | 'finished';
          time_control?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      simul_tables: {
        Row: {
          id: string;
          simul_id: string;
          challenger_id: string | null;
          game_id: string | null;
          seat_no: number;
          status: 'open' | 'playing' | 'done';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          simul_id: string;
          challenger_id?: string | null;
          game_id?: string | null;
          seat_no: number;
          status?: 'open' | 'playing' | 'done';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          simul_id?: string;
          challenger_id?: string | null;
          game_id?: string | null;
          seat_no?: number;
          status?: 'open' | 'playing' | 'done';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      simul_invites: {
        Row: {
          simul_id: string;
          invited_user_id: string;
          created_at: string;
        };
        Insert: {
          simul_id: string;
          invited_user_id: string;
          created_at?: string;
        };
        Update: {
          simul_id?: string;
          invited_user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      games: {
        Row: {
          id: string;
          simul_id: string | null;
          white_id: string;
          black_id: string;
          status: 'waiting' | 'active' | 'checkmate' | 'draw' | 'resigned' | 'aborted';
          turn: 'w' | 'b';
          fen: string;
          last_move_uci: string | null;
          move_count: number;
          clocks: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          simul_id?: string | null;
          white_id: string;
          black_id: string;
          status?: 'waiting' | 'active' | 'checkmate' | 'draw' | 'resigned' | 'aborted';
          turn?: 'w' | 'b';
          fen?: string;
          last_move_uci?: string | null;
          move_count?: number;
          clocks?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          simul_id?: string | null;
          white_id?: string;
          black_id?: string;
          status?: 'waiting' | 'active' | 'checkmate' | 'draw' | 'resigned' | 'aborted';
          turn?: 'w' | 'b';
          fen?: string;
          last_move_uci?: string | null;
          move_count?: number;
          clocks?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      moves: {
        Row: {
          id: number;
          game_id: string;
          ply: number;
          uci: string;
          san: string | null;
          fen_after: string;
          played_by: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          game_id: string;
          ply: number;
          uci: string;
          san?: string | null;
          fen_after: string;
          played_by: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          game_id?: string;
          ply?: number;
          uci?: string;
          san?: string | null;
          fen_after?: string;
          played_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      friends: {
        Row: {
          user_id_1: string;
          user_id_2: string;
          status: 'pending' | 'accepted' | 'blocked';
          action_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id_1: string;
          user_id_2: string;
          status?: 'pending' | 'accepted' | 'blocked';
          action_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id_1?: string;
          user_id_2?: string;
          status?: 'pending' | 'accepted' | 'blocked';
          action_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      direct_messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      match_queue: {
        Row: {
          id: string;
          user_id: string;
          time_control: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          time_control: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          time_control?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      invites: {
        Row: {
          id: string;
          from_user: string;
          to_user: string;
          time_control: string;
          status: 'pending' | 'accepted' | 'declined' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          from_user: string;
          to_user: string;
          time_control: string;
          status?: 'pending' | 'accepted' | 'declined' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          from_user?: string;
          to_user?: string;
          time_control?: string;
          status?: 'pending' | 'accepted' | 'declined' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_friend_request: {
        Args: { friend_id: string };
        Returns: void;
      };
      decline_friend_request: {
        Args: { friend_id: string };
        Returns: void;
      };
      get_friend_requests: {
        Args: Record<string, never>;
        Returns: {
          requestor_id: string;
          username: string | null;
          avatar_url: string | null;
          created_at: string | null;
        }[];
      };
      get_friends: {
        Args: Record<string, never>;
        Returns: {
          friend_id: string;
          username: string | null;
          avatar_url: string | null;
          connected_since: string | null;
        }[];
      };
      get_messages: {
        Args: { friend_id: string };
        Returns: {
          sender_id: string;
          receiver_id: string;
          content: string;
          created_at: string | null;
        }[];
      };
      get_user_id_by_username: {
        Args: { p_username: string };
        Returns: string | null;
      };
      list_friend_requests: {
        Args: Record<string, never>;
        Returns: {
          requestor_id: string;
          username: string | null;
          avatar_url: string | null;
          created_at: string | null;
        }[];
      };
      list_friends: {
        Args: Record<string, never>;
        Returns: {
          friend_id: string;
          username: string | null;
          avatar_url: string | null;
          connected_since: string | null;
        }[];
      };
      send_friend_request: {
        Args: { friend_id: string };
        Returns: void;
      };
      send_message: {
        Args: { receiver_id: string; content: string };
        Returns: { id: string; created_at: string | null }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
