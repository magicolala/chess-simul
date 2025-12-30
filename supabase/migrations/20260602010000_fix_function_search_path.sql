-- Lock function search_path to prevent role-mutable behavior.
alter function public.send_friend_request(uuid) set search_path = public, auth;
alter function public.get_user_id_by_username(text) set search_path = public, auth;
alter function public.handle_timestamps() set search_path = public, auth;
alter function public.default_uuid() set search_path = public, auth;
alter function public.update_game_after_move() set search_path = public, auth;
