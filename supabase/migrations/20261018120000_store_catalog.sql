-- Aeromédico Brasil — Loja: catálogo de produtos físicos
--
-- Cria categorias, produtos, variações (tamanho/cor) e fotos da loja da marca
-- principal. NÃO inclui carrinho, cupom, frete, pagamento nem pedidos (fases
-- seguintes). Dinheiro sempre em centavos (inteiros).
--
-- PRÉ-REQUISITO: as 4 migrations do CMS (20260905120000 a 20260905120300)
-- já aplicadas — esta usa `public.set_updated_at()` e `public.is_admin()`.
--
-- COMO APLICAR: rode no SQL Editor do Supabase do Aeromédico Brasil, ANTES de
-- publicar qualquer versão do site que acesse /loja. Sem estas tabelas, a
-- loja falha. Nenhum agente aplica este arquivo; o catálogo nasce vazio (o
-- dono cadastra tudo pelo painel), sem dados de demonstração.

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------

create table public.store_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category_id uuid references public.store_categories (id) on delete set null,
  name text not null,
  description text not null default '',
  base_price_cents integer not null check (base_price_cents > 0),
  -- Peso e dimensões de UMA unidade embalada (base do cálculo de frete).
  weight_grams integer not null check (weight_grams > 0),
  length_cm integer not null check (length_cm > 0),
  width_cm integer not null check (width_cm > 0),
  height_cm integer not null check (height_cm > 0),
  -- true quando o produto é vendido por tamanho/cor. Existe porque a RLS
  -- esconde variações não publicadas do visitante: sem este campo, "produto
  -- único" e "todas as variações despublicadas" pareceriam iguais.
  has_variants boolean not null default false,
  featured boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index store_products_published_order_idx
  on public.store_products (published, sort_order);
create index store_products_category_idx
  on public.store_products (category_id);

create table public.store_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products (id) on delete cascade,
  sku text,
  size text,
  color_name text,
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9a-fA-F]{6}$'),
  -- null = usa o preço/peso do produto.
  price_cents integer check (price_cents is null or price_cents > 0),
  weight_grams integer check (weight_grams is null or weight_grams > 0),
  -- null = sem limite de estoque; 0 = esgotado.
  stock integer check (stock is null or stock >= 0),
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_variants_has_option check (size is not null or color_name is not null)
);

-- Uma combinação tamanho+cor por produto (null conta como valor vazio).
create unique index store_variants_combo_idx
  on public.store_variants (product_id, coalesce(size, ''), coalesce(color_name, ''));
create unique index store_variants_sku_idx
  on public.store_variants (sku) where sku is not null;
create index store_variants_product_idx
  on public.store_variants (product_id, sort_order);

create table public.store_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products (id) on delete cascade,
  url text not null,
  alt text not null default '',
  -- Quando preenchido, a foto aparece ao escolher essa cor.
  color_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index store_product_images_product_idx
  on public.store_product_images (product_id, sort_order);

-- ---------------------------------------------------------------------
-- updated_at (função criada na migration 20260905120000)
-- ---------------------------------------------------------------------

create trigger set_store_categories_updated_at
  before update on public.store_categories
  for each row execute function public.set_updated_at();

create trigger set_store_products_updated_at
  before update on public.store_products
  for each row execute function public.set_updated_at();

create trigger set_store_variants_updated_at
  before update on public.store_variants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security — mesmo padrão do CMS: visitante lê só o publicado,
-- administrador (public.is_admin()) lê e escreve tudo.
-- ---------------------------------------------------------------------

alter table public.store_categories enable row level security;
alter table public.store_products enable row level security;
alter table public.store_variants enable row level security;
alter table public.store_product_images enable row level security;

-- Visitante nunca escreve; TRUNCATE ignora RLS, então também é revogado.
revoke insert, update, delete, truncate on
  public.store_categories,
  public.store_products,
  public.store_variants,
  public.store_product_images
from anon;

revoke truncate on
  public.store_categories,
  public.store_products,
  public.store_variants,
  public.store_product_images
from authenticated;

-- store_categories
create policy "public reads published store categories"
  on public.store_categories for select
  using (published = true or public.is_admin());
create policy "admin inserts store categories"
  on public.store_categories for insert
  with check (public.is_admin());
create policy "admin updates store categories"
  on public.store_categories for update
  using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes store categories"
  on public.store_categories for delete
  using (public.is_admin());

-- store_products
create policy "public reads published store products"
  on public.store_products for select
  using (published = true or public.is_admin());
create policy "admin inserts store products"
  on public.store_products for insert
  with check (public.is_admin());
create policy "admin updates store products"
  on public.store_products for update
  using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes store products"
  on public.store_products for delete
  using (public.is_admin());

-- store_variants: só quando a variação E o produto estão publicados
create policy "public reads published store variants"
  on public.store_variants for select
  using (
    public.is_admin()
    or (
      published = true
      and exists (
        select 1 from public.store_products p
        where p.id = store_variants.product_id and p.published = true
      )
    )
  );
create policy "admin inserts store variants"
  on public.store_variants for insert
  with check (public.is_admin());
create policy "admin updates store variants"
  on public.store_variants for update
  using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes store variants"
  on public.store_variants for delete
  using (public.is_admin());

-- store_product_images: só quando o produto está publicado
create policy "public reads images of published store products"
  on public.store_product_images for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.store_products p
      where p.id = store_product_images.product_id and p.published = true
    )
  );
create policy "admin inserts store product images"
  on public.store_product_images for insert
  with check (public.is_admin());
create policy "admin updates store product images"
  on public.store_product_images for update
  using (public.is_admin()) with check (public.is_admin());
create policy "admin deletes store product images"
  on public.store_product_images for delete
  using (public.is_admin());
