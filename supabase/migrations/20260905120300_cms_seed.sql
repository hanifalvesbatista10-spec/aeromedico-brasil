-- Aeromédico Brasil — Seed do conteúdo já existente
--
-- Migra para o banco exatamente o que já está em src/data/*.ts hoje.
-- Nada foi inventado: formações, conteúdos, palestras e FAQ marcados como
-- is_demo_content=true (quando a coluna existe) são os mesmos itens de
-- demonstração já presentes no código, para que a landing continue
-- mostrando o mesmo conteúdo assim que a leitura trocar para o Supabase.
-- Depoimentos e materiais ficam vazios — nenhum depoimento real ou
-- material foi cadastrado ainda (ver src/data/testimonials.ts, hoje []).

-- ---------------------------------------------------------------------
-- profiles (singleton)
-- ---------------------------------------------------------------------

insert into public.profiles (id, name, role, credentials, short_bio, long_bio, photo_url, instagram_handle)
values (
  true,
  'Lucio Macêdo',
  'Enfermeiro · Especialista em APH e Transporte Aeromédico',
  array[
    'Enfermeiro',
    'Mestre em Ensino na Saúde',
    'Palestrante',
    'Professor universitário',
    'Especialista em Atendimento Pré-Hospitalar (APH)',
    'Especialista em Transporte Aeromédico'
  ],
  'Enfermeiro, mestre em Ensino na Saúde e professor universitário, dedicado a formar profissionais para o atendimento pré-hospitalar e o transporte aeromédico.',
  'Lucio Macêdo atua na formação de profissionais de saúde e emergência, com foco no transporte aeromédico e no atendimento pré-hospitalar. Produz conteúdo educacional e científico voltado a enfermeiros, técnicos, médicos, socorristas, bombeiros e integrantes do SAMU, e é professor universitário e palestrante.',
  '/brand/lucio-macedo.png',
  '@aeromedico.brasil'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- site_settings (singleton)
-- ---------------------------------------------------------------------

insert into public.site_settings (
  id, site_name, site_description, stats, whatsapp_url, email, instagram_url,
  primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href,
  footer_note, logo_url
)
values (
  true,
  'Aeromédico Brasil',
  'Educação, ciência e experiência aplicadas à formação de profissionais que atuam na urgência, emergência e aviação médica.',
  '[
    {"id": "followers", "label": "Comunidade no Instagram", "value": "+120 mil seguidores"},
    {"id": "focus", "label": "Área de atuação", "value": "Transporte aeromédico e APH"},
    {"id": "content", "label": "Conteúdo", "value": "Ciência aplicada à prática"}
  ]'::jsonb,
  'https://wa.me/',
  'contato@aeromedicobrasil.com.br',
  'https://www.instagram.com/aeromedico.brasil/',
  'Conheça as formações',
  '/formacoes',
  'Fale com a equipe',
  '/contato',
  'Os conteúdos educacionais deste site não substituem protocolos institucionais, regulamentações vigentes ou treinamento prático supervisionado.',
  '/brand/logo.jpg'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- programs — os 3 itens de demonstração de src/data/programs.ts
-- ---------------------------------------------------------------------

insert into public.programs (
  slug, type, category, title, short_description, duration_hours, format,
  status, featured, published, sort_order, is_demo_content
)
values
  (
    'curso-transporte-aeromedico-basico', 'curso', 'Curso',
    'Transporte Aeromédico Básico',
    'Fundamentos do transporte aeromédico: fisiologia de voo, biossegurança e organização da equipe durante a missão.',
    16, 'online', 'disponivel', true, true, 0, true
  ),
  (
    'mentoria-carreira-aeromedica', 'mentoria', 'Mentoria',
    'Mentoria em Carreira Aeromédica',
    'Acompanhamento individual para profissionais de saúde que querem migrar ou evoluir na carreira em transporte aeromédico.',
    null, 'online', 'proximas-turmas', true, true, 1, true
  ),
  (
    'treinamento-equipes-resgate', 'treinamento', 'Treinamento',
    'Treinamento para Equipes de Resgate',
    'Programa presencial para equipes de resgate que atuam em interface com aeronaves e cenários de emergência.',
    24, 'presencial', 'em-breve', true, true, 2, true
  )
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- content_posts — os 3 itens de demonstração de src/data/content-posts.ts
-- ---------------------------------------------------------------------

insert into public.content_posts (
  slug, kind, category, title, summary, author, published_at, external_url,
  published, sort_order, is_demo_content
)
values
  (
    'fisiologia-de-voo-o-que-todo-profissional-precisa-saber', 'artigo', 'Ciência',
    'Fisiologia de voo: o que todo profissional precisa saber',
    'Como a altitude e a pressurização afetam o paciente crítico durante o transporte aeromédico.',
    'Lucio Macêdo', '2026-06-10', null, true, 0, true
  ),
  (
    'checklist-pre-voo-da-equipe-de-saude', 'video', 'Prática',
    'Checklist pré-voo da equipe de saúde',
    'Passo a passo dos itens que a equipe de saúde confere antes de embarcar em uma missão aeromédica.',
    'Lucio Macêdo', '2026-05-22', null, true, 1, true
  ),
  (
    'entrevista-sobre-formacao-em-aph', 'link-externo', 'Entrevista',
    'Entrevista sobre formação em APH',
    'Conversa sobre os caminhos de formação para quem quer atuar no atendimento pré-hospitalar.',
    'Lucio Macêdo', '2026-04-15', 'https://www.instagram.com/aeromedico.brasil/', true, 2, true
  )
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- speaking_topics — os 5 formatos de src/data/speaking-topics.ts
-- ---------------------------------------------------------------------

insert into public.speaking_topics (kind, title, description, published, sort_order)
values
  ('palestra', 'Palestras',
   'Apresentações sobre transporte aeromédico, APH e educação em saúde, adaptadas ao público e à duração do evento.',
   true, 0),
  ('treinamento', 'Treinamentos para equipes',
   'Programas práticos para equipes de saúde e resgate que atuam ou querem atuar em transporte aeromédico.',
   true, 1),
  ('evento', 'Participação em eventos',
   'Participação como palestrante convidado em congressos, encontros e eventos do setor de saúde e emergência.',
   true, 2),
  ('aula', 'Aulas e programas educacionais',
   'Aulas avulsas ou módulos dentro de programas de graduação, pós-graduação e educação continuada.',
   true, 3),
  ('mentoria', 'Consultoria e mentoria',
   'Acompanhamento para profissionais e instituições que querem estruturar ou revisar processos de transporte aeromédico.',
   true, 4);

-- ---------------------------------------------------------------------
-- faq_items — as 6 perguntas de src/data/faq.ts
-- ---------------------------------------------------------------------

insert into public.faq_items (question, answer, published, sort_order)
values
  ('Para quem são as formações?',
   'As formações são voltadas a profissionais e estudantes da saúde — enfermeiros, técnicos, médicos, socorristas, bombeiros e integrantes do SAMU — interessados em transporte aeromédico e atendimento pré-hospitalar. Cada formação indica o público recomendado em sua página.',
   true, 0),
  ('Como funcionam as inscrições?',
   'Cada formação tem sua própria página com um botão de inscrição. Quando a inscrição ainda não está aberta, a página indica isso claramente em vez de um link de pagamento.',
   true, 1),
  ('Os cursos estão disponíveis on-line?',
   'Sim, várias formações são oferecidas no formato on-line. O formato de cada uma — presencial, on-line ou híbrido — está indicado na página específica.',
   true, 2),
  ('Como contratar uma palestra?',
   'Use o formulário de solicitação de proposta na página de Palestras, informando o tipo de evento e o público esperado. A equipe retorna com os detalhes de formato e disponibilidade.',
   true, 3),
  ('As formações emitem certificado?',
   'A carga horária e as condições de certificação de cada formação estão descritas em sua própria página, já que variam conforme o programa.',
   true, 4),
  ('Como posso entrar em contato?',
   'Pelo formulário de contato do site ou pelos canais informados no rodapé, incluindo WhatsApp e Instagram.',
   true, 5);

-- testimonials, materials e leads ficam sem seed: nenhum depoimento real
-- autorizado, nenhum material e nenhum lead existem ainda.
