CREATE OR REPLACE FUNCTION public.get_user_id_by_username(p_username TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
BEGIN
    SELECT id INTO user_id FROM public.profiles WHERE username = p_username;
    RETURN user_id;
END;
$$;
