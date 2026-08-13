-- b2b-promo 데이터베이스 스키마 (PostgreSQL 17)
-- 근거: docs/8-erd.md

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_type  varchar(10) NOT NULL CHECK (account_type IN ('ADMIN', 'BUYER')),
    email         varchar(255) NOT NULL UNIQUE,
    password_hash varchar(255) NOT NULL,
    name          varchar(100) NOT NULL,
    company_name  varchar(255),
    created_at    timestamptz NOT NULL DEFAULT now()
);

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

CREATE TABLE applications (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_id  uuid NOT NULL REFERENCES samples(id),
    user_id    uuid NOT NULL REFERENCES users(id),
    status     varchar(10) NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'CANCELLED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (sample_id, user_id)
);
