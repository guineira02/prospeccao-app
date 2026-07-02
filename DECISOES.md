# Prospecção Nexi — Decisões da Sessão

Documento técnico de tudo que foi construído e **por que** cada escolha foi feita.
Sistema de prospecção comercial consultiva para a **Tendência Energia**.

- **No ar:** https://prospeccao-app.netlify.app
- **Repo:** https://github.com/guineira02/prospeccao-app
- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Supabase · Netlify · n8n · Anthropic (Haiku)

---

## 1. A dor (o problema real)

Marcelly Severo coordena 760+ empresas no Ceará e Norte e não fecha contrato há 6 meses. O problema **não é falta de lead — é falta de ritmo**. Ela liga, anota no papel, abre o CRM, abre a agenda, volta pro CRM. Cada troca de tela quebra o fio; quando o ritmo quebra, o pipeline esfria.

Pedido dela, literal: *"Quero ligar, registrar o que aconteceu, salvar e já aparecer a próxima atividade — sem sair da tela."*

**Toda decisão de produto abaixo serve a esse princípio: manter o ritmo.**

---

## 2. Arquitetura de dados — a decisão central

A Nexi (backend Bubble) é a fonte dos **clientes**. O Supabase é a fonte do **ritmo** (atividades, follow-ups, metadados).

**Insight-chave:** a Nexi **não tem** "status de prospecção". Em vez de inventar um campo lá, o status é **derivado** da última atividade registrada no nosso Supabase (`lib/constants.ts → derivarEstagio`):

```
Novo → Em contato → Negociando → Estudo → Proposta → Declinado
```

**Por quê:** evita duplicar verdade. Cliente vem da Nexi; o que acontece com ele é nosso. Assim nunca há conflito de "quem manda" num campo.

### Endpoints Nexi usados
- `login_mobile` (POST `{email, senha}`) → valida credencial, devolve `user_id` + dados do agente
- `clientes_mobile` (POST `{user_id}`) → lista de clientes do agente
- `atualizar_cliente_prospeccao` (POST) → grava enriquecimento de volta (criado nesta sessão)

### Tabelas Supabase
- `pt_atividades` — timeline (tipo, status, comentário, follow_up_data)
- `pt_clientes_meta` — concorrente + vencimento de contrato (radar de renovação)
- `pt_preferencias` — notificações por agente
- `app_secrets` — cofre de tokens (ver seção 9)

Mapeamento real dos campos da Nexi (descoberto testando os endpoints ao vivo, não adivinhando): `Nome`, `CNPJ`, `API_UF`/`Company's adress`, `Valor Fatura`, `Economia`, `Contact phone/email/name`. Normalizado em `lib/nexi.ts → normalizeCliente`.

---

## 3. Autenticação — credencial Nexi → sessão Supabase

**Decisão:** o agente loga com a credencial da Nexi (sem cadastro novo). O fluxo:

1. `login_mobile` valida email/senha na Nexi → devolve o `user_id` real
2. Criamos/abrimos um "shadow user" no Supabase Auth (email = o da Nexi, senha = derivada do `user_id`)
3. O `user_id` real da Nexi fica no `user_metadata.nexi_id`
4. Cookies httpOnly (`sb-access-token`, `sb-refresh-token`)

**Por quê o shadow user:** o Supabase Auth dá de graça sessão segura + **RLS** (Row Level Security). Com RLS, o agente B nunca vê os dados do agente A — requisito de aprovação do desafio.

**Bug corrigido:** a versão inicial gravava o email como `nexi_id` em vez do `user_id` real → `clientes_mobile` voltava vazio. Agora grava o `user_id` verdadeiro do `login_mobile`.

**Reset de senha shadow no login:** como a verdade da auth é a Nexi, a cada login resetamos a senha shadow no Supabase. Isso evita o erro "credenciais inválidas" quando o shadow user já existia com senha antiga.

---

## 4. Modo Atendimento — a peça-showcase

`/dashboard/atender`. Resolve a dor literal.

- **Entrada = lista** de clientes da fila (decisão do usuário: ver os clientes, clicar e entrar no card)
- Clica num cliente → abre o **card imersivo**
- Teclado: `1-7` tipo, `Q/W/E/R` resultado, `Enter` salva+avança, `Esc` volta pra lista
- Botão de **WhatsApp** direto no card (ligar/conversar sem sair)
- Follow-up automático **+2 dias úteis** (pula fim de semana — `addDiasUteis`)
- Card sai animado, próximo entra (sensação de "deck") → reforça o ritmo

**Por quê teclado + auto-avança:** o gargalo da Marcelly é troca de contexto. Tudo numa tela, sem mouse, próximo cliente automático = ritmo preservado.

---

## 5. IA de análise comercial (Haiku)

Botão **✦ Análise de IA** no card do cliente.

- **Modelo:** `claude-haiku-4-5` (escolha do usuário — rápido e barato pro volume)
- **Persona:** destilada dos 2 PDFs da Tendência (`lib/tendencia.ts`) — vende **valor/autoridade, não preço**; gatilho regulatório (fim do desconto TUSD/TUST pós-2025); abordagem SDR consultiva; imparcialidade
- **Entrada:** histórico real do cliente + tempo ocioso + follow-up atrasado
- **Saída estruturada** (JSON schema): diagnóstico, sinais, urgência, canal, abordagem, script pronto

**Por quê saída estruturada:** garante JSON parseável pra UI, sem "alucinar" formato.

**Decisão técnica importante — fetch direto em vez do SDK:** o `@anthropic-ai/sdk`, no ambiente serverless do Netlify, pegava a key **errada do `process.env`** em vez da que passávamos explícito → erro 401. Diagnosticado isolando *fetch cru (200) vs SDK (401)* com a mesma key. Solução: chamar a API Anthropic via `fetch` direto. Mais previsível, sem dependência do comportamento do SDK no serverless.

---

## 6. Enriquecimento CNPJ → grava na Nexi

No card do cliente, botão "Enriquecer via CNPJ":

1. Consulta Receita Federal (proxy CNPJá)
2. **Grava de volta na Nexi** via `atualizar_cliente_prospeccao` (razão social, CNAE, atividade, situação, município, UF, etc.)
3. Atualiza a tela na hora (re-puxa o cliente fresco)

**Decisão de segurança de dados — não sobrescrever com vazio:** a Receita às vezes volta telefone/email vazios. Antes de gravar, lemos o cliente atual e **preenchemos os vazios com o que já existe**, pra nunca apagar dado bom. Sem isso, enriquecer um CNPJ sem telefone na Receita apagaria o telefone cadastrado.

---

## 7. Notificações de follow-up atrasado (WhatsApp via n8n)

**Decisão do usuário:** WhatsApp em vez de email (mais rápido; já existe integração n8n + Evolution da Nexi).

- Endpoint `/api/notificacoes/run` varre os follow-ups atrasados >2 dias **por agente**
- Para cada agente, **empurra** `{phone, mensagem2}` pro webhook n8n, que dispara o WhatsApp
- Protegido por `CRON_SECRET` (n8n agenda 1x/dia e chama o endpoint)
- Tela `/dashboard/perfil`: liga/desliga + número (com máscara BR) + **botão de teste**

**Destinatário = o agente** (não o cliente). É um lembrete pra ele dos clientes dele que esfriaram.

**Estilo de mensagem escolhido — "Consultivo Direto":** curto, escaneável, negrito nos nomes, 1 emoji por seção, CTA com link. Tom de parceiro, não robô.

---

## 8. Datas em formato BR

Componente `DateBR` (`app/components/DateBR.tsx`): sempre mostra `dd/mm/aaaa` independente do idioma do sistema operacional, mas abre o calendário nativo. O valor guardado continua ISO (`aaaa-mm-dd`) pro banco.

**Por quê um componente próprio:** o `<input type="date">` nativo mostra o formato do SO (que pode ser US). Não dá pra forçar BR nele. A solução: input nativo invisível (só pro calendário) + texto formatado por cima.

---

## 9. Secrets no Supabase (decisão de segurança do usuário)

**Pedido:** guardar os tokens no Supabase por segurança.

- Tabela `app_secrets` (key/value), **RLS bloqueia o anon** (testado: anon recebe `[]`; só o `service_role` lê)
- `lib/secrets.ts → getSecret(key)`: lê do Supabase (cache de 60s) com fallback pro `.env`
- **Movidos pro Supabase:** `NEXI_API_KEY`, `NEXI_API_BASE`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `CRON_SECRET`, `N8N_WEBHOOK_URL`, `APP_URL`
- **Continuam no env (bootstrap obrigatório):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Por quê o bootstrap fica no env:** pra ler o `app_secrets` o app precisa da chave de serviço do Supabase. Essa é a "chave-mestra" — não dá pra guardar dentro do cofre que ela mesma abre.

**Vantagem real:** rotacionar um segredo = `UPDATE` na tabela, sem redeploy (cache expira em 60s).

---

## 10. Deploy

- **Netlify**, build automático no push do `main`
- Variáveis de ambiente cadastradas via API do Netlify
- `.env.local` no `.gitignore` — **nunca** sobe; verificado que nenhuma key aparece no código nem no histórico do git

---

## 11. Identidade visual

Design system da Nexi, elevado: fundo `#15161b`, cards `#1e1f24`, brand `#09bc8a`, fonte Montserrat. Direção "cockpit comercial" — dark, profundidade em camadas, brand usado como sinal de energia. Hovers, entrada com stagger, command palette (Cmd+K), micro-interações.

---

## 12. Bugs encontrados e resolvidos nesta sessão

| Bug | Causa | Solução |
|---|---|---|
| Clientes vazios | `nexi_id` salvava email, não `user_id` | Gravar `user_id` real do `login_mobile` |
| Login falhava | shadow user com senha antiga | Resetar senha shadow no login |
| Meta não salvava | `onConflict` errado (PK composta) | `onConflict: 'cliente_id,agente_id'` |
| Enriquecer apagava telefone | Receita vinha vazia + Bubble sobrescrevia | Preencher vazios com valor atual |
| IA dava 401 | SDK Anthropic pegava key errada do env no serverless | Trocar SDK por fetch direto |
| Cron redirecionava | middleware bloqueava `/api/notificacoes` | Liberar a rota (protegida por secret) |

---

## 13. Cobertura do desafio (critério do Junior)

**Mínimo (80 pts) — 100% coberto:** URL pública · login Nexi · clientes automáticos · timeline+registro · RLS · credenciais fora do código.

**Bônus:** UX cuidada · KPIs · notificação (WhatsApp).

**Além do brief:** IA consultiva · enriquecimento CNPJ→Nexi · ações em massa · filtro por região · radar de renovação · command palette.

---

## 14. Pendências

- [ ] Ativar webhook n8n (método POST + workflow ativo) pro WhatsApp disparar
- [ ] Rotacionar tokens que foram expostos no chat (boa prática)
- [ ] Opcional: squash dos 3 commits de debug no histórico
