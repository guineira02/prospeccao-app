# BRIEF — Sistema de Linha do Tempo de Prospecção

## O que estou construindo

Um sistema web que facilita a visibilidade de clientes de uma base, separada por usuários. Usuário A vê somente seus clientes e usuário B vê somente os seus. Não há hierarquia nesse sistema.

O fluxo central é:

```
Login → autenticação com a Nexi → lista de clientes → linha do tempo do cliente
```

O agente comercial entra com suas credenciais da Nexi — o mesmo login que ele já usa. Não há cadastro separado. Após autenticar, o sistema carrega automaticamente a base de clientes vinculada a ele.

Dentro de cada cliente, existe uma linha do tempo com todos os contatos realizados: ligação, resposta, retorno, estudo solicitado, estudo apresentado, proposta, declínio. O agente registra o que aconteceu, escreve um comentário e o sistema já sugere a próxima data de follow-up.

---

## Por que esse sistema precisa existir

O agente comercial hoje fragmenta o trabalho entre planilha, agenda e CRM. Cada troca de tela quebra o ritmo. O objetivo desse sistema é concentrar tudo em um único lugar: o card do cliente. O agente não precisa sair da tela para registrar um contato, ver o histórico e saber o que fazer depois.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js (React) |
| Banco de dados | Supabase |
| Autenticação | Credenciais da Nexi → sessão criada no Supabase Auth |
| Notificações | Brevo (e-mail) + WhatsApp via integração Nexi |
| Deploy | Vercel |

---

## Autenticação

A autenticação usa as credenciais da Nexi. Não é um OAuth 2.0 completo — é mais simples: o agente digita e-mail e senha no sistema, essas credenciais são validadas direto na Nexi, e em caso de sucesso o sistema abre uma sessão segura no Supabase Auth.

Do ponto de vista do agente: um botão "Entrar com a Nexi" → modal com e-mail e senha → logado, clientes já carregados.

---

## Telas

### Login
Tela centrada, mínima. Botão único: **"Entrar com a Nexi"**. Sem cadastro, sem recuperação de senha nesse sistema.

### Lista de clientes
- Clientes carregados automaticamente da Nexi com base no agente logado
- Cada card mostra: razão social, status do último contato, data do próximo follow-up
- Badge vermelho: follow-up atrasado
- Badge amarelo: contrato do concorrente vencendo em menos de 6 meses
- Filtros: UF, status, follow-up atrasado

### Linha do tempo do cliente
- Coluna esquerda: dados do cliente (Nexi + Receita Federal via CNPJ) + concorrente + data de vencimento
- Coluna direita: timeline vertical, do mais recente ao mais antigo
- Botão fixo: **"Registrar Contato"** — abre modal, não sai da tela

### Modal de registro
- Tipo: Ligação | Resposta | Retorno | Estudo Solicitado | Estudo Apresentado | Proposta | Declínio
- Status: Atendeu | Não atendeu | Agendou retorno | Cliente recusou
- Comentário livre
- Data de follow-up (pré-preenchida com +2 dias úteis, editável)

### Painel
- 4 KPIs: total de clientes, follow-ups atrasados, contatados essa semana, renovações próximas
- Lista dos 10 follow-ups mais urgentes com link direto para o cliente

---

## Notificações

O agente pode configurar como quer ser notificado quando um follow-up está atrasado há mais de 2 dias:

- **E-mail** via Brevo
- **WhatsApp** via integração existente da Nexi
- Ou ambos

A preferência é salva no perfil do agente no Supabase.

---

## Banco de dados (Supabase)

Apenas o que não vem da Nexi:

```sql
-- Atividades da linha do tempo
CREATE TABLE pt_atividades (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id      UUID NOT NULL,
  cliente_id     TEXT NOT NULL,
  tipo           TEXT NOT NULL,
  status         TEXT NOT NULL,
  comentario     TEXT,
  follow_up_data DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Metadados do cliente (não vêm da Nexi)
CREATE TABLE pt_clientes_meta (
  cliente_id               TEXT PRIMARY KEY,
  agente_id                UUID NOT NULL,
  concorrente_atual        TEXT,
  data_vencimento_contrato DATE,
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Preferências de notificação do agente
CREATE TABLE pt_preferencias (
  agente_id        UUID PRIMARY KEY,
  notif_email      BOOLEAN DEFAULT true,
  notif_whatsapp   BOOLEAN DEFAULT false,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

Row Level Security ativo em todas as tabelas: agente vê e edita somente seus próprios dados.

---

## Identidade visual

Segue o design system da Nexi:
- Fundo: `#15161b`
- Cards: `#1e1f24`
- Cor brand: `#09bc8a`
- Fonte: Inter
- Sem cores fora da paleta definida

---

## Segurança

- Credenciais da Nexi nunca expostas no frontend
- Chaves do Supabase e Brevo em variáveis de ambiente (`.env`)
- `.env` no `.gitignore`
- Nenhuma rota acessível sem sessão ativa
- RLS garante isolamento total entre agentes

---

## O que não vou construir nesse sistema

- Cadastro de cliente (vem da Nexi)
- Cadastro de usuário (autenticação via Nexi)
- Exportação de CSV
- Módulo financeiro
- Hierarquia entre agentes

---

## Prioridade de entrega

1. Auth funcionando (Nexi → sessão Supabase)
2. Lista de clientes carregada da Nexi
3. Linha do tempo + modal de registro
4. RLS testado + deploy no Vercel
5. Painel de KPIs
6. Enriquecimento por CNPJ
7. Notificações (Brevo + WhatsApp)
