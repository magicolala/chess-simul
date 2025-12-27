CREATE OR REPLACE FUNCTION public.send_friend_request(friend_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.friends (user_id_1, user_id_2, status, action_user_id)
    -- Ensure user_id_1 is always the smaller UUID to avoid duplicate rows
    VALUES (
        LEAST(auth.uid(), friend_id),
        GREATEST(auth.uid(), friend_id),
        'pending',
        auth.uid()
    );
END;
$$;
