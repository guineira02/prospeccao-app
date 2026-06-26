# OAuth — Guia de Configuração e Contexto

## O que é OAuth (em linguagem humana)

Imagine que você quer entrar num prédio usando o crachá de outra empresa. Você não dá sua senha pra ninguém — você apresenta o crachá, o sistema valida, e você entra. OAuth funciona assim.

No prospeccao-app:
- O agente clica "Entrar com a Nexi"
- O app redireciona para o site da Nexi (Bubble)
- O agente já está logado na Nexi — ou faz login lá
- A Nexi gera um **código temporário** e devolve pro app
- O app troca esse código por um **token de acesso**
- Com esse token, o app busca os dados do agente (nome, clientes, etc.)

**O agente nunca digitou senha no prospeccao-app.** A senha ficou na Nexi.

---

## Por que isso importa (segurança)

| Abordagem ruim | Abordagem OAuth |
|---|---|
| Agente digita senha no prospeccao-app | Agente autentica direto na Nexi |
| App armazena a senha do agente | App nunca vê a senha |
| Se o app vazar, senha vaza | Se o app vazar, token expira |
| Agente precisa confiar no app | Agente só precisa confiar na Nexi |

Token tem prazo de validade. Senha não. Token pode ser revogado. Senha não (sem ação do usuário).

---

## Por que o desafio exige isso

O critério de aprovação inclui:

> *"Explica com suas próprias palavras como o OAuth da Nexi funciona no código"*

E o que elimina automaticamente:

> *"Token da Nexi exposto no frontend"*

Ou seja: o Junior vai abrir o DevTools do navegador e procurar o token. Se aparecer — reprovado. Com OAuth implementado corretamente, o token fica num cookie `httpOnly` — JavaScript do navegador não consegue ler, nem o DevTools.

---

## Onde está no Bubble

```
nexiplay.com (editor Bubble)
  → Settings (menu lateral esquerdo)
    → General
      → Role até "3rd Party OAuth / SAML Access"
        → Clica "Add a new 3rd party app"
```

---

## Como criar o app OAuth

### Passo 1 — Adicionar app

Clica **"Add a new 3rd party app"** e preenche:

| Campo | Valor |
|---|---|
| Name | `Prospeccao App` |
| Redirect URI (dev) | `http://localhost:3000/api/auth/callback` |
| Redirect URI (produção) | `https://SEU-APP.netlify.app/api/auth/callback` |

> Bubble permite múltiplas Redirect URIs no mesmo app — adicione as duas.

### Passo 2 — Copiar credenciais

Após criar, Bubble mostra:

- `Client ID` — identificador público do app
- `Client Secret` — chave secreta, **nunca vai para o código ou GitHub**

### Passo 3 — Adicionar ao .env.local

```env
NEXI_OAUTH_CLIENT_ID=cole_o_client_id_aqui
NEXI_OAUTH_CLIENT_SECRET=cole_o_client_secret_aqui
NEXI_OAUTH_AUTH_URL=https://nexiplay.com/oauth/authorize
NEXI_OAUTH_TOKEN_URL=https://nexiplay.com/oauth/token
NEXT_PUBLIC_APP_URL=https://SEU-APP.netlify.app
```

> `.env.local` já está no `.gitignore` — nunca commite esse arquivo.

---

## Como o fluxo funciona no código

```
1. Agente clica "Entrar com a Nexi"
         ↓
2. GET /api/auth/nexi-login  (rota Next.js — servidor)
   → gera "state" aleatório (proteção anti-ataque CSRF)
   → salva state em cookie httpOnly
   → redireciona para Bubble

3. Bubble autentica o agente
         ↓
4. GET /api/auth/callback?code=xxx&state=yyy  (rota Next.js — servidor)
   → valida state (confirma que a requisição veio do app, não de terceiro)
   → troca o "code" pelo token real (POST para Bubble — servidor pra servidor)
   → busca dados do agente com o token
   → cria sessão no Supabase
   → guarda tokens em cookies httpOnly (invisíveis pro JavaScript)
   → redireciona para /dashboard

5. Todas as chamadas à API da Nexi passam pelo servidor Next.js
   → servidor lê o token do cookie
   → frontend nunca toca no token
```

---

## O que é o "state" e por que existe

Sem state, um atacante poderia redirecionar o agente para uma URL maliciosa no meio do fluxo OAuth e capturar o código de autorização. O state é um número aleatório gerado pelo servidor no passo 2 e validado no passo 4. Se não bater — requisição rejeitada.

---

## Checklist antes de implementar

- [ ] App criado no Bubble (Settings → 3rd Party OAuth)
- [ ] `Client ID` copiado para `.env.local`
- [ ] `Client Secret` copiado para `.env.local` (nunca no código)
- [ ] Redirect URI de dev e produção cadastradas no Bubble
- [ ] `.env.local` está no `.gitignore`

---

## Checklist para o dia da apresentação

- [ ] Login OAuth funciona na URL pública (não localhost)
- [ ] Depois de logar, clientes carregam automaticamente
- [ ] Abre DevTools → Application → Cookies → token não aparece em nenhum cookie legível por JS
- [ ] Consegue explicar o fluxo dos 5 passos acima com suas palavras
