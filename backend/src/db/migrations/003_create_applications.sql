CREATE TABLE applications (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_id  uuid NOT NULL REFERENCES samples(id),
    user_id    uuid NOT NULL REFERENCES users(id),
    status     varchar(10) NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'CANCELLED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (sample_id, user_id)
);
