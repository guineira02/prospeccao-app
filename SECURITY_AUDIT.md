# Security Audit — Prospecção App
**Data:** 2026-06-29  
**Auditor:** Claude Sonnet 4.6 (ethical hacking mode)  
**Escopo:** `C:\Users\guilh\prospeccao-app` — Next.js + Supabase + Bubble OAuth2  
**Produção:** https://prospeccao-app.netlify.app

---

## Como a auditoria foi feita

### Metodologia

1. **Mapeamento de superfície** — listei todos os arquivos `.ts/.tsx` excluindo `node_modules`
2. **Leitura de segredos** — `.env.local`, `lib/secrets.ts`, `lib/supabase-admin.ts`
3. **Análise do middleware** — `middleware.ts` → entendi quais rotas são protegidas e quais não são
4. **Rastreamento do fluxo OAuth** — `app/api/auth/callback/route.ts` → encontrei o padrão de senha previsível
5. **Auditoria de cada rota API** — verifiquei autenticação, ownership check e o que cada rota devolve
6. **Diferenciação `getSupabaseForUser` vs `getSupabaseAdmin`** — entendi onde RLS é respeitado e onde é bypassado
7. **Análise da rota de notificações** — rota pública + payload de dados sensíveis

### Ferramentas utilizadas

- Leitura direta de arquivos de código (sem execução)
- Análise estática manual das rotas e fluxos de autenticação
- Rastreamento de dependências entre funções (`getSecret`, `getSupabaseAdmin`, `nexiEstudoViabilidade`)

---

## Resumo Executivo

| Severidade | Qtd | Status |
|------------|-----|--------|
| 🔴 Crítico | 2 | Requer correção imediata |
| 🟠 Alto | 4 | Requer correção antes de escalar usuários |
| 🟡 Médio | 4 | Corrigir na próxima sprint |
| 🟢 Baixo | 3 | Melhoria incremental |

**O risco mais grave:** qualquer pessoa autenticada no sistema pode se passar por outro usuário no Supabase — sem explorar nenhuma vulnerabilidade técnica avançada, apenas conhecendo o e-mail de alguém.

---

## 🔴 CRÍTICO

---

### C1 — Senha Shadow Previsível: Bypass Completo do OAuth

**Arquivo:** `app/api/auth/callback/route.ts:45`

```typescript
const supaPass = `nexi:${user.user_id}`
```

**O que é:** Ao fazer login via OAuth, o sistema cria um "shadow user" no Supabase com senha fixa = `nexi:` + o Bubble user_id do agente.

**Por que é crítico:** O `user_id` do Bubble **não é secreto**. Ele aparece em respostas de API, é armazenado como `nexi_id` nos metadados do usuário Supabase, e pode ser obtido por qualquer agente logado via `/api/me`. Com e-mail + user_id de um colega, um atacante pode:

```bash
# Ataque direto ao Supabase — sem passar pelo OAuth
curl -X POST 'https://lmsucsoujldyztmumyxd.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"email":"colega@nexi.com","password":"nexi:1698702246298x123456"}'
```

O retorno é um `access_token` Supabase válido. Com ele o atacante acessa `/api/clientes`, `/api/atividades`, `/api/estudo` como se fosse a vítima — sem o Bubble saber.

**Impacto:** Acesso completo à carteira de clientes, histórico de contatos e dados de prospecção de qualquer agente.

**Como corrigir:**

```typescript
// ❌ Atual — previsível
const supaPass = `nexi:${user.user_id}`

// ✅ Fix — senha derivada por HMAC com secret do servidor
import crypto from 'crypto'

const supaPass = crypto
  .createHmac('sha256', process.env.SHADOW_PASSWORD_SECRET!)
  .update(user.user_id)
  .digest('hex')
```

Adicionar no Netlify env vars e `.env.local`:
```
SHADOW_PASSWORD_SECRET=<random 64 char hex — gerar com: openssl rand -hex 32>
```

**Proteção extra — Supabase Dashboard:**
Settings → Auth → desabilitar "Email + Password" como provider. Forçar apenas OAuth. Isso elimina o vetor completamente — ninguém consegue logar diretamente no Supabase mesmo com senha correta.

---

### C2 — `/api/notificacoes/run` Pública + Dump de Dados de Todos os Agentes

**Arquivos:** `middleware.ts:8` + `app/api/notificacoes/run/route.ts:31-32`

**Bypass do middleware:**
```typescript
// middleware.ts — notificacoes NUNCA passa pelo middleware
const isPublic = ... || pathname.startsWith('/api/notificacoes')
```

**Bypass do CRON_SECRET:**
```typescript
// run/route.ts:31-32
const secret = await getSecret('CRON_SECRET')
if (secret && enviado !== secret) { ... }  // ← se secret for '', check é PULADO
```

Se `CRON_SECRET` não estiver setado no ambiente, qualquer pessoa na internet pode chamar:

```bash
POST https://prospeccao-app.netlify.app/api/notificacoes/run
# Sem header, sem autenticação → 200 OK
```

**O que o response devolve (mesmo com CRON_SECRET correto, isto é um vazamento):**
```json
{
  "ok": true,
  "agentes_com_atraso": 5,
  "agentes": [
    {
      "agente_id": "uuid-supabase",
      "nome": "Nome Completo do Agente",
      "whatsapp": "5511999999999",
      "total": 3,
      "mensagem": "Olá, João! Você tem 3 follow-ups...",
      "clientes": [
        { "nome": "Empresa XYZ", "uf": "SP", "diasAtraso": 8 }
      ]
    }
  ]
}
```

Dados de todos os agentes com follow-up atrasado: nome, WhatsApp, clientes em atraso.

**Como corrigir:**

```typescript
export async function POST(req: NextRequest) {
  const secret = await getSecret('CRON_SECRET')
  const enviado = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret')
  
  // ✅ Rejeitar se secret não estiver configurado OU se não bater
  if (!secret || enviado !== secret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // ... resto do código
  
  // ✅ Não devolver payload completo — só estatísticas
  return NextResponse.json({
    ok: true,
    agentes_com_atraso: payload.length,
    disparados,
    erros: erros.length ? erros : undefined,
    // ❌ Remover: agentes: payload  ← dados sensíveis desnecessários
  })
}
```

**No middleware**, remover a exceção de notificações:
```typescript
// ❌ Atual — remove auth de TUDO em /api/notificacoes
pathname.startsWith('/api/notificacoes')

// ✅ Fix — remover essa linha do isPublic
// Middleware protege tudo. A rota /run verifica CRON_SECRET por conta própria.
```

---

## 🟠 ALTO

---

### H1 — IDOR em `/api/atividades/[clienteId]`

**Arquivo:** `app/api/atividades/[clienteId]/route.ts:17-22`

```typescript
// Qualquer agente autenticado pode chamar /api/atividades/QUALQUER_ID
const { data, error } = await supabase
  .from('pt_atividades')
  .select('*')
  .eq('cliente_id', clienteId)  // ← sem filtro por agente_id
```

Agente A pode ler o histórico completo de atendimento dos clientes do agente B — incluindo comentários internos, scripts de abordagem, status de negociação.

**Como corrigir:**

**No código:**
```typescript
const { data, error } = await supabase
  .from('pt_atividades')
  .select('*')
  .eq('cliente_id', clienteId)
  .eq('agente_id', user.id)  // ← garante ownership
  .order('created_at', { ascending: false })
```

**RLS no Supabase (defesa em profundidade):**
```sql
ALTER TABLE pt_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agente_ve_proprias_atividades"
  ON pt_atividades FOR SELECT
  USING (agente_id = auth.uid()::text);
```

---

### H2 — Sem Verificação de Dono em `/api/estudo/[clienteId]`

**Arquivo:** `app/api/estudo/[clienteId]/route.ts:19`

```typescript
// Qualquer agente autenticado obtém o estudo de QUALQUER clienteId
const arquivos = await nexiEstudoViabilidade(clienteId)
```

`nexiEstudoViabilidade` usa `NEXI_API_KEY` (chave de sistema) — busca dados do Bubble sem restrição de propriedade.

**Como corrigir:**
```typescript
// Verificar que clienteId pertence ao agente antes de buscar
const nexiId = udata.user.user_metadata?.nexi_id as string
const clientes = await nexiClientes(nexiId)
if (!clientes.some(c => c.id === clienteId)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
const arquivos = await nexiEstudoViabilidade(clienteId)
```

---

### H3 — Sem Verificação de Dono em `/api/analise/[clienteId]` + Queima de Créditos

**Arquivo:** `app/api/analise/[clienteId]/route.ts:33-35`

Mesmo padrão do H2. Qualquer autenticado pode POSTar para `/api/analise/ID_ALHEIO` e:
1. Receber dados de atividades de clientes de outros agentes
2. Consumir créditos da `ANTHROPIC_API_KEY` sem limite

**Como corrigir:** Mesma verificação de ownership antes de processar a análise.

---

### H4 — `/api/enriquecer/[clienteId]` Escreve na Nexi Sem Verificar Dono

**Arquivo:** `app/api/enriquecer/[clienteId]/route.ts:66`

```typescript
// Grava dados de volta no Bubble para QUALQUER clienteId
const salvoNexi = await nexiAtualizarCliente(nexiId, clienteId, dados)
```

Agente pode sobrescrever dados (razão social, CNAE, e-mail, telefone) de qualquer cliente na Nexi.

**Como corrigir:**
```typescript
const clientes = await nexiClientes(nexiId)
if (!clientes.some(c => c.id === clienteId)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

## 🟡 MÉDIO

---

### M1 — `listUsers()` no Callback OAuth: Lento e Desnecessário

**Arquivo:** `app/api/auth/callback/route.ts:48`

```typescript
// ❌ Busca TODOS os usuários pra encontrar um por e-mail
const { data: list } = await admin.auth.admin.listUsers()
const existente = list?.users?.find(u => u.email?.toLowerCase() === emailNorm)
```

**Fix:**
```typescript
// ✅ Busca direto por e-mail
const { data } = await admin.auth.admin.getUserByEmail(emailNorm)
const existente = data?.user ?? null
```

---

### M2 — RLS da Tabela `app_secrets` Desconhecida

**Arquivo:** `lib/secrets.ts`

A tabela `app_secrets` armazena todas as chaves sensíveis. Se RLS não bloquear o role `anon`, qualquer pessoa pode ler todos os segredos usando a `NEXT_PUBLIC_SUPABASE_ANON_KEY` (visível no bundle JS do browser).

**Como verificar e corrigir:**
```sql
-- Ativar RLS — sem policies = nenhum acesso por anon/authenticated
-- Service role bypassa automaticamente
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;
-- Não criar nenhuma policy → apenas service_role acessa
```

---

### M3 — Sem Rate Limiting em Rotas Custosas

| Rota | Custo |
|------|-------|
| `POST /api/analise/[id]` | Anthropic Haiku — custo por token |
| `GET /api/cnpj/[cnpj]` | Créditos do CNPJA proxy |
| `POST /api/notificacoes/run` | Disparo de WhatsApp em massa |

**Fix no n8n:** Adicionar throttle/rate limit no webhook antes de chamar `/api/notificacoes/run`.

---

### M4 — `/api/atividades` POST Não Valida Ownership dos `cliente_ids`

**Arquivo:** `app/api/atividades/route.ts:33-44`

Agente pode inserir atividades em clientes de outros agentes — poluindo histórico alheio.

**Fix:**
```typescript
const clientes = await nexiClientes(nexiId)
const clienteIds = new Set(clientes.map(c => c.id))
const idsInvalidos = ids.filter(id => !clienteIds.has(id))
if (idsInvalidos.length > 0) {
  return NextResponse.json({ error: 'Cliente(s) não pertencem ao agente' }, { status: 403 })
}
```

---

## 🟢 BAIXO

---

### L1 — Middleware Verifica Existência do Cookie, Não Validade

O middleware só checa se `sb-access-token` existe — não valida o JWT. JWT expirado ou manipulado passa pelo middleware, é rejeitado na rota. Aceitável para UI redirect, mas cada rota nova deve obrigatoriamente ter seu próprio `auth.getUser(token)`.

---

### L2 — `/api/auth/*` Completamente Público

Correto para `/login`, `/callback`, `/logout`. Mas futuras rotas sob `/api/auth/` são automaticamente públicas. Considere listar explicitamente em vez de usar `startsWith`.

---

### L3 — Cookie `oauth_state` Deveria Ser `SameSite=Strict`

O cookie de CSRF protection no OAuth deve usar `strict`, não `lax`.

```typescript
res.cookies.set('oauth_state', state, {
  httpOnly: true,
  sameSite: 'strict',  // ← não 'lax'
  maxAge: 60 * 10,
  path: '/',
})
```

---

## Plano de Ação Priorizado

### Semana 1 — Crítico

| # | Ação | Arquivo | Tempo estimado |
|---|------|---------|----------------|
| 1 | Substituir senha shadow por HMAC com `SHADOW_PASSWORD_SECRET` | `callback/route.ts` | 30min |
| 2 | Fixar lógica `if (!secret \|\| ...)` na rota run | `notificacoes/run/route.ts` | 5min |
| 3 | Remover `pathname.startsWith('/api/notificacoes')` do middleware | `middleware.ts` | 2min |
| 4 | Remover `agentes: payload` do response da rota run | `notificacoes/run/route.ts` | 2min |
| 5 | Ativar RLS em `pt_atividades` e `pt_preferencias` no Supabase | SQL Editor | 20min |

### Semana 2 — Alto (ownership checks)

| # | Ação | Arquivo | Tempo estimado |
|---|------|---------|----------------|
| 6 | Adicionar `.eq('agente_id', user.id)` em `atividades/[clienteId]` | `atividades/[id]/route.ts` | 5min |
| 7 | Adicionar ownership check em `/api/estudo` | `estudo/[id]/route.ts` | 15min |
| 8 | Adicionar ownership check em `/api/analise` | `analise/[id]/route.ts` | 15min |
| 9 | Adicionar ownership check em `/api/enriquecer` | `enriquecer/[id]/route.ts` | 15min |
| 10 | Adicionar ownership check em POST `/api/atividades` | `atividades/route.ts` | 20min |

### Semana 3 — Médio

| # | Ação | Arquivo | Tempo estimado |
|---|------|---------|----------------|
| 11 | Substituir `listUsers()` por `getUserByEmail()` | `callback/route.ts` | 10min |
| 12 | Verificar e ativar RLS em `app_secrets` | Supabase SQL | 10min |
| 13 | Tornar `PUBLIC_PATHS` lista explícita no middleware | `middleware.ts` | 10min |
| 14 | Fixar `SameSite=strict` no cookie oauth_state | `auth/login/route.ts` | 5min |

---

## SQL de RLS Recomendado — Supabase

Rodar no **SQL Editor** do projeto `lmsucsoujldyztmumyxd`:

```sql
-- pt_atividades
ALTER TABLE pt_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_proprias" ON pt_atividades
  FOR SELECT USING (agente_id = auth.uid()::text);

CREATE POLICY "insert_proprias" ON pt_atividades
  FOR INSERT WITH CHECK (agente_id = auth.uid()::text);

CREATE POLICY "update_proprias" ON pt_atividades
  FOR UPDATE USING (agente_id = auth.uid()::text);

CREATE POLICY "delete_proprias" ON pt_atividades
  FOR DELETE USING (agente_id = auth.uid()::text);

-- pt_preferencias
ALTER TABLE pt_preferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_proprio" ON pt_preferencias
  FOR SELECT USING (agente_id = auth.uid()::text);

CREATE POLICY "all_proprio" ON pt_preferencias
  FOR ALL USING (agente_id = auth.uid()::text)
  WITH CHECK (agente_id = auth.uid()::text);

-- app_secrets (somente service_role — sem policies = sem acesso anon)
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;
-- Não criar policies: service_role bypassa RLS, anon/authenticated ficam bloqueados
```

---

## Segredos a Rotacionar

Os seguintes segredos foram encontrados em `.env.local` — são reais e válidos. O `.gitignore` os exclui corretamente (`.env*`). Rotacionar como precaução caso tenham sido expostos:

| Segredo | Onde Rotacionar |
|---------|-----------------|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |
| `NEXI_API_KEY` | Bubble → Settings → API |
| `BUBBLE_CLIENT_SECRET` | Bubble → Plugins → OAuth App |
| `CRON_SECRET` | Gerar novo: `openssl rand -hex 32` → Netlify env vars |
| Token Netlify (Personal Access Token "GuiCriaAPP") | netlify.com → User Settings → Personal Access Tokens |

---

*Auditoria realizada em 2026-06-29 por análise estática do código-fonte.*
