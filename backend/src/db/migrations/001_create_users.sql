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
