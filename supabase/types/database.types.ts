// Generated from migrations snapshot. Update alongside Supabase schema changes.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
      simul_round_robin_sessions: {
        Row: {
          id: string;
          organizer_id: string;
          invite_code: string;
          status: 'draft' | 'started' | 'completed';
          created_at: string;
          started_at: string | null;
        };
        Insert: {
          id?: string;
          organizer_id: string;
          invite_code: string;
          status?: 'draft' | 'started' | 'completed';
          created_at?: string;
          started_at?: string | null;
        };
        Update: {
          id?: string;
          organizer_id?: string;
          invite_code?: string;
          status?: 'draft' | 'started' | 'completed';
          created_at?: string;
          started_at?: string | null;
        };
        Relationships: [];
      };
      simul_round_robin_participants: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          status: 'active' | 'left';
          joined_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          status?: 'active' | 'left';
          joined_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          status?: 'active' | 'left';
          joined_at?: string;
        };
        Relationships: [];
      };
      simul_round_robin_game_links: {
        Row: {
          id: string;
          session_id: string;
          game_id: string;
          white_id: string;
          black_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          game_id: string;
          white_id: string;
          black_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          game_id?: string;
          white_id?: string;
          black_id?: string;
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
      hydra_match_queue: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          elo: number | null;
          max_games: number;
          time_control_initial: number;
          time_control_increment: number;
          status: string;
          elo_min: number | null;
          elo_max: number | null;
          last_range_update_at: string | null;
          tournament_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          elo?: number | null;
          max_games?: number;
          time_control_initial: number;
          time_control_increment: number;
          status?: string;
          elo_min?: number | null;
          elo_max?: number | null;
          last_range_update_at?: string | null;
          tournament_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          elo?: number | null;
          max_games?: number;
          time_control_initial?: number;
          time_control_increment?: number;
          status?: string;
          elo_min?: number | null;
          elo_max?: number | null;
          last_range_update_at?: string | null;
          tournament_id?: string | null;
        };
        Relationships: [];
      };
      hydra_tournaments: {
        Row: {
          id: string;
          name: string;
          type: 'arena' | 'survival';
          start_time: string;
          duration_minutes: number | null;
          capital_lives: number | null;
          status: 'pending' | 'active' | 'completed' | 'cancelled';
          created_at: string;
          updated_at: string;
          end_time: string | null;
          survival_lives_default: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          type: 'arena' | 'survival';
          start_time?: string;
          duration_minutes?: number | null;
          capital_lives?: number | null;
          status?: 'pending' | 'active' | 'completed' | 'cancelled';
          created_at?: string;
          updated_at?: string;
          end_time?: string | null;
          survival_lives_default?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'arena' | 'survival';
          start_time?: string;
          duration_minutes?: number | null;
          capital_lives?: number | null;
          status?: 'pending' | 'active' | 'completed' | 'cancelled';
          created_at?: string;
          updated_at?: string;
          end_time?: string | null;
          survival_lives_default?: number | null;
        };
        Relationships: [];
      };
      hydra_tournament_participants: {
        Row: {
          id: string;
          tournament_id: string;
          user_id: string;
          score: number;
          lives_remaining: number | null;
          joined_at: string;
          eliminated_at: string | null;
          active_game_count: number;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          user_id: string;
          score?: number;
          lives_remaining?: number | null;
          joined_at?: string;
          eliminated_at?: string | null;
          active_game_count?: number;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          user_id?: string;
          score?: number;
          lives_remaining?: number | null;
          joined_at?: string;
          eliminated_at?: string | null;
          active_game_count?: number;
        };
        Relationships: [];
      };
      hydra_games: {
        Row: {
          id: string;
          tournament_id: string;
          white_player_id: string;
          black_player_id: string;
          status: 'pending' | 'active' | 'finished' | 'forfeited';
          result: 'white_win' | 'black_win' | 'draw' | 'forfeit' | null;
          time_control: string;
          start_time: string;
          end_time: string | null;
          last_move_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          white_player_id: string;
          black_player_id: string;
          status?: 'pending' | 'active' | 'finished' | 'forfeited';
          result?: 'white_win' | 'black_win' | 'draw' | 'forfeit' | null;
          time_control?: string;
          start_time?: string;
          end_time?: string | null;
          last_move_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          white_player_id?: string;
          black_player_id?: string;
          status?: 'pending' | 'active' | 'finished' | 'forfeited';
          result?: 'white_win' | 'black_win' | 'draw' | 'forfeit' | null;
          time_control?: string;
          start_time?: string;
          end_time?: string | null;
          last_move_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      hydra_game_pgn: {
        Row: {
          id: string;
          game_id: string;
          pgn_text: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          pgn_text: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          pgn_text?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      hydra_score_events: {
        Row: {
          id: string;
          tournament_id: string;
          participant_id: string;
          game_id: string;
          delta: number;
          reason: 'win' | 'draw' | 'loss' | 'forfeit';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          participant_id: string;
          game_id: string;
          delta: number;
          reason: 'win' | 'draw' | 'loss' | 'forfeit';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          participant_id?: string;
          game_id?: string;
          delta?: number;
          reason?: 'win' | 'draw' | 'loss' | 'forfeit';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      hydra_matchmaking_events: {
        Row: {
          id: string;
          tournament_id: string;
          player_id: string;
          queue_action: 'join' | 'leave' | 'match';
          elo_min: number | null;
          elo_max: number | null;
          matched_game_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          player_id: string;
          queue_action: 'join' | 'leave' | 'match';
          elo_min?: number | null;
          elo_max?: number | null;
          matched_game_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          player_id?: string;
          queue_action?: 'join' | 'leave' | 'match';
          elo_min?: number | null;
          elo_max?: number | null;
          matched_game_id?: string | null;
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
