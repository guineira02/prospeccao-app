-- RLS — Prospecção Nexi (projeto lmsucsoujldyztmumyxd)
-- Aplicado em produção em 2026-07-01 via conexão direta (pooler).
-- Isolamento por agente_id em todas as tabelas que guardam dado do agente
-- (defesa em profundidade — o código já filtra por agente_id, isto garante
-- mesmo se um filtro futuro esquecer o .eq()).
--
-- ACHADO ao aplicar: pt_atividades já tinha uma policy "agente_ve_proprias_atividades"
-- (ALL, USING (true), role public) — liberava QUALQUER linha pra QUALQUER autenticado.
-- Postgres faz OR entre policies permissivas do mesmo comando, então essa policy
-- sozinha anulava as restritivas abaixo. RLS na tabela estava desligada até esta
-- aplicação, então o buraco nunca foi explorável via RLS — mas ficaria aberto
-- assim que alguém ligasse RLS sem notar essa policy. Removida (DROP abaixo).

-- pt_atividades
DROP POLICY IF EXISTS "agente_ve_proprias_atividades" ON pt_atividades;
ALTER TABLE pt_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_proprias" ON pt_atividades
  FOR SELECT USING (agente_id = auth.uid()::text);

CREATE POLICY "insert_proprias" ON pt_atividades
  FOR INSERT WITH CHECK (agente_id = auth.uid()::text);

CREATE POLICY "update_proprias" ON pt_atividades
  FOR UPDATE USING (agente_id = auth.uid()::text);

CREATE POLICY "delete_proprias" ON pt_atividades
  FOR DELETE USING (agente_id = auth.uid()::text);

-- pt_clientes_meta (agente_id é uuid aqui, não text — sem cast)
ALTER TABLE pt_clientes_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_proprio" ON pt_clientes_meta
  FOR SELECT USING (agente_id = auth.uid());

CREATE POLICY "all_proprio" ON pt_clientes_meta
  FOR ALL USING (agente_id = auth.uid())
  WITH CHECK (agente_id = auth.uid());

-- pt_preferencias (agente_id é uuid aqui, não text — sem cast)
ALTER TABLE pt_preferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_proprio_pref" ON pt_preferencias
  FOR SELECT USING (agente_id = auth.uid());

CREATE POLICY "all_proprio_pref" ON pt_preferencias
  FOR ALL USING (agente_id = auth.uid())
  WITH CHECK (agente_id = auth.uid());

-- app_secrets — cofre de tokens. Sem policy nenhuma = só service_role acessa
-- (service_role sempre bypassa RLS). anon/authenticated ficam bloqueados
-- mesmo tendo a NEXT_PUBLIC_SUPABASE_ANON_KEY, que é pública no bundle JS.
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;
