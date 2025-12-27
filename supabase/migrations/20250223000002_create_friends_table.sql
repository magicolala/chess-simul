CREATE TABLE public.friends (
    user_id_1 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_id_2 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
    -- The user who initiated the request
    action_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id_1, user_id_2),
    CONSTRAINT check_users_not_equal CHECK (user_id_1 <> user_id_2)
);
