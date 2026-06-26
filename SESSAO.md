# Sessão 24-25/06/2026 — Entendimentos e decisões

## A dor real (nunca esquecer)

Marcelly Severo, coordenadora comercial, gerencia 760 empresas no Ceará e Norte.
Não fecha contrato há 6 meses. O problema não é falta de lead — é falta de ritmo.

Ela anota ligação no papel, abre o CRM, abre a agenda, volta pro CRM.
Cada troca de tela quebra o fio. Quando o ritmo quebra, o pipeline esfria.

**Pedido dela, com as próprias palavras:**
> "Quero ligar pro cliente, registrar o que aconteceu, salvar o contato
> e já aparecer a próxima atividade — sem sair da tela."

---

## O que o sistema resolve

Um lugar só por cliente. O agente:
1. Abre o card
2. Vê todo o histórico em timeline
3. Clica "Registrar Contato" → modal (não sai da tela)
4. Salva → follow-up já aparece gerado (+2 dias úteis)
5. Fecha. Próximo cliente.

Sem planilha. Sem troca de tela. Sem perder o fio.

---

## Decisões técnicas fechadas

| Decisão | Escolha | Motivo |
|---|---|---|
| Frontend | Next.js 16 + TypeScript + Tailwind v4 | API Routes resolvem OAuth sem servidor separado |
| Banco | Supabase próprio (novo projeto) | Separado do Simple, credenciais isoladas |
| Auth | Credenciais Nexi → sessão Supabase | Endpoint `/login_mobile` já existe — mais simples que OAuth 2.0 |
| Email | Brevo | Nexi já paga, mais confiável que Supabase Edge |
| WhatsApp | n8n + API Nexi existente | Reutiliza integração já em produção |
| Deploy | Netlify | Repo: github.com/guineira02/prospeccao-app |
| Identidade visual | Design System Nexi | Dark, #09bc8a brand, Inter, minimalista |

---

## Supabase — projeto prospecção

- **URL:** https://lmsucsoujldyztmumyxd.supabase.co
- **Tabelas criadas:** `pt_atividades`, `pt_clientes_meta`, `pt_preferencias`
- **RLS:** ativo em todas — agente vê só seus dados

---

## Tipos de atividade definidos

Ligação | Resposta | Retorno | Estudo Solicitado | Estudo Apresentado | Proposta | Declínio

## Status de atividade definidos

Atendeu | Não atendeu | Agendou retorno | Cliente recusou

---

## Notificações (preferência por agente)

- Email via Brevo quando follow-up atrasa > 2 dias
- WhatsApp via n8n (configurável pelo agente no perfil)
- Tabela `pt_preferencias` salva a preferência

---

## Estrutura do projeto (C:\Users\guilh\prospeccao-app)

```
prospeccao-app/
├── app/
│   ├── api/auth/login/route.ts   — valida Nexi → cria sessão Supabase
│   ├── api/auth/logout/route.ts  — limpa cookies
│   ├── page.tsx                  — tela de login
│   ├── layout.tsx
│   └── globals.css               — tokens Nexi design system
├── lib/
│   ├── supabase.ts               — client browser
│   ├── supabase-admin.ts         — server admin
│   └── nexi.ts                   — nexiLogin(), nexiGetClientes()
├── proxy.ts                      — proteção de rotas (Next.js 16)
├── BRIEF.md                      — brief do desafio (avaliado pelo Junior)
└── .env.local                    — credenciais (gitignored)
```

---

## Prazo

**Sexta 26/06** — apresentação ao vivo 15 minutos para o Junior.

### Critério mínimo (80 pts para aprovação)
- App na URL pública ✓ (Netlify)
- Login via Nexi funcionando
- Clientes carregados automaticamente da Nexi
- Registro de atividade + timeline
- RLS: agente B não vê dados do agente A
- Credenciais em .env, não no código

### Bônus disponíveis
- +10 UX cuidada
- +5 KPIs funcionando
- +10 email de notificação

---

## Pendente

- [ ] Conectar repo `guineira02/prospeccao-app` no Netlify (estava com repo Vite antigo)
- [ ] Testar login real com credenciais Nexi
- [ ] Dashboard de clientes `/dashboard` (integrado com API Nexi)
- [ ] Timeline `/cliente/[id]`
- [ ] Modal de registro de contato
- [ ] Painel de KPIs
- [ ] Enriquecimento CNPJ (api.nexiplay.com.br/api/cnpj)
- [ ] Notificação Brevo
- [ ] Redesign visual — usuário quer algo que surpreenda

---

## Nota sobre o design

O primeiro protótipo (HTML estático) foi considerado simples demais.
Próxima versão precisa surpreender — manter identidade Nexi mas com
mais personalidade visual, hierarquia clara e micro-interações.
