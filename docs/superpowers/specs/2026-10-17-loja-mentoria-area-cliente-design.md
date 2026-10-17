# Loja, mentoria e área do cliente — desenho

Data: 2026-10-17 · Origem: conversa com o responsável pelo projeto após reunião com o cliente (Lucio Macêdo / Aeromédico Brasil). Onde a conversa disse algo, está marcado **[decidido]**. O que foi escolha minha está marcado **[minha escolha]** e pode ser trocado.

## Intenção

O cliente quer transformar o site institucional em uma operação de venda no padrão de uma empresa grande (Mercado Livre, Magazine Luiza, Amazon): vitrine de produtos, compra com frete calculado sozinho, conta do comprador com histórico, e autonomia total do dono sobre catálogo e pedidos. O prazo é curto: a entrega ao cliente é o objetivo.

## O que será construído

### 1. Produtos digitais (separados da loja) **[decidido]**
- **Mentoria Aeromédico**, para médicos e enfermeiros. Hoje só divulgada: página de apresentação, como qualquer produto. O botão de compra leva ao **WhatsApp do cliente** "até segunda ordem". A estrutura deve aceitar pagamento por API depois, sem refazer a página.
- **Cursos online breves**, mesma lógica de vitrine. Como o curso é entregue ao aluno ainda não foi definido (fora do escopo até definir).
- Aparecem **em destaque no site** ("o profissional tem a mentoria X disponível"). Não aparecem na área do cliente.

### 2. Área gratuita **[decidido]**
Informações abertas que levam o visitante aos produtos. **[minha escolha]** Uma página `/gratuito` reunindo materiais públicos e conteúdos recentes, com chamadas para mentoria, cursos e loja.

### 3. Loja de produtos físicos, da marca principal **[decidido]**
- Linhas: **camisetas, bonés e patches** (patch de velcro para macacão, blusa ou mural). Outros produtos virão: o dono adiciona e exclui sozinho.
- Camiseta com **tamanhos e cores**. Há cerca de 14 cores no vídeo enviado; as fotos finais serão providenciadas pelo cliente e subidas pelo painel.
- Carrinho com **cupom de desconto**, CEP, **frete calculado automaticamente** pela **Melhor Envio** a partir de peso e tamanho (boné com peso e medida; peso médio por tipo), e total **com frete incluso**. O cliente paga produto e frete juntos.
- Pagamento por API.

### 4. Área do cliente (quem compra) **[decidido]**
Conta do comprador: ver pedidos, acompanhar status, ver últimos pedidos e **repeti-los**, endereço e dados cadastrais salvos para a próxima compra.
**[minha escolha]** Etapas de status: recebido, pago, em separação, enviado, entregue, com rastreio da Melhor Envio. Cadastro na primeira compra. Dados: nome, e-mail, telefone, CPF.

### 5. Painel do dono **[decidido]**
Autonomia total para adicionar, editar e excluir produtos, tamanhos, cores, categorias, cupons, e acompanhar e atualizar pedidos. Estende o `/admin` existente.

## Objetivos, não objetivos, antiobjetivos

**Objetivos:** entregar a mentoria e os destaques primeiro, depois a loja completa, depois a área do cliente; tudo gerenciável pelo dono sem código.
**Não objetivos:** marketplace de vendedores terceiros; emissão de nota fiscal; estoque em vários depósitos; afiliados; plataforma de aulas (área de membros com vídeo); app mobile.
**Antiobjetivos (seria falha mesmo funcionando):** preço, estoque, curso ou depoimento inventado; chave secreta no código; frete calculado errado que dê prejuízo; comprador digitando de novo dados que já salvou; mistura entre conta de comprador e conta de administrador.

## Restrições

- Next.js 16 (App Router), Supabase com RLS, somente chave publicável (nunca `service_role`).
- Contas de comprador e de administrador separadas: administrador continua definido por `admin_users`; comprador é qualquer usuário autenticado que não esteja lá, com acesso apenas aos próprios dados.
- Valores em **centavos (inteiros)**. Pedido guarda um retrato do preço, do frete e do cupom no momento da compra.
- Migrations são entregues como arquivos SQL; o responsável as executa no SQL Editor. Nenhum agente aplica SQL remoto.
- Sem push e sem deploy. Commits locais em branch própria.
- Preservar identidade visual, Hero, preloader e funcionalidades atuais.

## Minhas escolhas técnicas **[minha escolha]**

- **Pagamento:** Mercado Pago (Pix e cartão), atrás de uma interface `PaymentProvider`, para trocar depois sem refazer a loja. A mentoria usa a mesma interface quando sair do WhatsApp.
- **Frete:** cliente HTTP da Melhor Envio (sandbox em desenvolvimento) atrás de `ShippingProvider`; sem token, usa uma **tabela de frete própria de reserva**, claramente identificada. Pacote do pedido: soma dos pesos e a maior combinação de dimensões, regra documentada e ajustável.
- **Carrinho:** no navegador (sem login), com cálculo de totais no servidor na hora de pagar. O servidor nunca confia no preço enviado pelo navegador.
- **Cupom:** percentual ou valor fixo, validade, pedido mínimo e limite de usos.
- **Estoque:** opcional por variação; sem estoque definido, vende sem limite.

## Pendências que dependem de terceiros

1. Conta e token da Melhor Envio, CEP de origem e embalagens padrão.
2. Credenciais do Mercado Pago (teste e produção) e a URL pública para os webhooks.
3. Número de WhatsApp real do cliente (hoje placeholder `https://wa.me/`).
4. Fotos finais das camisetas, bonés e patches; preços, tamanhos, cores, pesos e medidas reais.
5. Preço e descrição reais da mentoria e dos cursos.
6. Habilitar cadastro de usuários no Supabase Auth (para compradores) e definir os e-mails de confirmação.
7. Política de troca e devolução, prazo de arrependimento (7 dias em venda online, CDC) e nota fiscal: decisões do cliente com contador/advogado, não do código.
8. Como o curso online é entregue ao aluno.

## O que fica para quem constrói

Layout detalhado das telas, nomes de tabelas e colunas, estrutura de pastas e ordem interna das tarefas, respeitando as restrições acima.
