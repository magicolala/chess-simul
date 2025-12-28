-- Ensure social RPCs use parameterless signatures for PostgREST
DROP FUNCTION IF EXISTS public.get_friend_requests(uuid);
DROP FUNCTION IF EXISTS public.get_friends(uuid);

CREATE OR REPLACE FUNCTION public.get_friend_requests()
RETURNS TABLE (requestor_id UUID, username TEXT, avatar_url TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT
        f.action_user_id AS requestor_id,
        p.username,
        p.avatar_url,
        f.created_at
    FROM public.friends f
    JOIN public.profiles p ON p.id = f.action_user_id
    WHERE f.status = 'pending'
      AND f.action_user_id <> auth.uid()
      AND (f.user_id_1 = auth.uid() OR f.user_id_2 = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.get_friends()
RETURNS TABLE (friend_id UUID, username TEXT, avatar_url TEXT, connected_since TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT
        CASE WHEN f.user_id_1 = auth.uid() THEN f.user_id_2 ELSE f.user_id_1 END AS friend_id,
        p.username,
        p.avatar_url,
        f.updated_at AS connected_since
    FROM public.friends f
    JOIN public.profiles p ON p.id = CASE WHEN f.user_id_1 = auth.uid() THEN f.user_id_2 ELSE f.user_id_1 END
    WHERE f.status = 'accepted'
      AND (f.user_id_1 = auth.uid() OR f.user_id_2 = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.get_friend_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friends() TO authenticated;
