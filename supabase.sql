create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  available boolean not null default true
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number integer not null unique,
  status text not null,
  payment_method text not null,
  payment_status text not null,
  whatsapp_number text,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  menu_item_id uuid not null references menu_items(id),
  name text not null,
  price numeric not null,
  qty integer not null
);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists app_counters (
  key text primary key,
  value bigint not null
);

insert into app_counters(key, value) values ('order_number', 0)
on conflict (key) do nothing;

create or replace function next_order_number()
returns integer
language plpgsql
as $$
declare v bigint;
begin
  update app_counters set value = value + 1 where key = 'order_number' returning value into v;
  return v::integer;
end;
$$;

