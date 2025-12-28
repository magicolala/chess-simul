-- RPC to accept a pending friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request(friend_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- RPC to decline (or block) a pending friend request
CREATE OR REPLACE FUNCTION public.decline_friend_request(friend_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.friends
    SET status = 'blocked',
        action_user_id = auth.uid(),
        updated_at = NOW()
    WHERE user_id_1 = LEAST(auth.uid(), friend_id)
      AND user_id_2 = GREATEST(auth.uid(), friend_id)
      AND status = 'pending'
      AND action_user_id <> auth.uid();
END;
$$;

-- List incoming friend requests for the current user
CREATE OR REPLACE FUNCTION public.list_friend_requests()
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
CREATE OR REPLACE FUNCTION public.list_friends()
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

-- Direct messages table for realtime chat
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_participants
    ON public.direct_messages (sender_id, receiver_id, created_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver_created
    ON public.direct_messages (receiver_id, created_at);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Only participants can read their conversations
DROP POLICY IF EXISTS "Direct messages are visible to participants" ON public.direct_messages;
CREATE POLICY "Direct messages are visible to participants"
    ON public.direct_messages
    FOR SELECT
    USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Users can send messages on their behalf
DROP POLICY IF EXISTS "Users can insert their own direct messages" ON public.direct_messages;
CREATE POLICY "Users can insert their own direct messages"
    ON public.direct_messages
    FOR INSERT
    WITH CHECK (sender_id = auth.uid());

-- Enable realtime broadcasting for chat events
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
