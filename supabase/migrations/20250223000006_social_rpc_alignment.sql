-- Align social RPCs with frontend service expectations

-- List incoming friend requests for the current user
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

-- List accepted friends for the current user
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

-- Allow the recipient to accept a pending friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request(friend_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    UPDATE public.friends
    SET status = 'accepted',
        action_user_id = auth.uid(),
        updated_at = NOW()
    WHERE user_id_1 = LEAST(auth.uid(), friend_id)
      AND user_id_2 = GREATEST(auth.uid(), friend_id)
      AND status = 'pending'
      AND action_user_id <> auth.uid();
END;
$$;

-- Decline a pending friend request by removing the pending friendship
CREATE OR REPLACE FUNCTION public.decline_friend_request(friend_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    DELETE FROM public.friends
    WHERE user_id_1 = LEAST(auth.uid(), friend_id)
      AND user_id_2 = GREATEST(auth.uid(), friend_id)
      AND status = 'pending'
      AND action_user_id <> auth.uid();
END;
$$;

-- Fetch messages between the current user and a friend
CREATE OR REPLACE FUNCTION public.get_messages(friend_id UUID)
RETURNS TABLE (sender_id UUID, receiver_id UUID, content TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT dm.sender_id, dm.receiver_id, dm.content, dm.created_at
    FROM public.direct_messages dm
    WHERE ((dm.sender_id = auth.uid() AND dm.receiver_id = friend_id)
        OR (dm.sender_id = friend_id AND dm.receiver_id = auth.uid()))
      AND EXISTS (
          SELECT 1
          FROM public.friends f
          WHERE f.status = 'accepted'
            AND f.user_id_1 = LEAST(auth.uid(), friend_id)
            AND f.user_id_2 = GREATEST(auth.uid(), friend_id)
      )
    ORDER BY dm.created_at ASC;
$$;

-- Send a chat message to an accepted friend
CREATE OR REPLACE FUNCTION public.send_message(receiver_id UUID, content TEXT)
RETURNS TABLE (id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    clean_content TEXT := btrim(content);
BEGIN
    IF clean_content IS NULL OR char_length(clean_content) = 0 THEN
        RAISE EXCEPTION 'Message content cannot be empty';
    END IF;

    IF receiver_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot send a message to yourself';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.friends f
        WHERE f.status = 'accepted'
          AND f.user_id_1 = LEAST(auth.uid(), receiver_id)
          AND f.user_id_2 = GREATEST(auth.uid(), receiver_id)
    ) THEN
        RAISE EXCEPTION 'You can only message accepted friends';
    END IF;

    RETURN QUERY
        INSERT INTO public.direct_messages (sender_id, receiver_id, content)
        VALUES (auth.uid(), receiver_id, clean_content)
        RETURNING id, created_at;
END;
$$;

-- Backwards compatibility for existing RPC names
CREATE OR REPLACE FUNCTION public.list_friend_requests()
RETURNS TABLE (requestor_id UUID, username TEXT, avatar_url TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT * FROM public.get_friend_requests();
$$;

CREATE OR REPLACE FUNCTION public.list_friends()
RETURNS TABLE (friend_id UUID, username TEXT, avatar_url TEXT, connected_since TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
    SELECT * FROM public.get_friends();
$$;
