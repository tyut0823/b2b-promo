CREATE TABLE samples (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        varchar(255) NOT NULL,
    description text,
    image_url   varchar(500),
    start_date  date NOT NULL,
    end_date    date NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);
