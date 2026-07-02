-- RLS — Prospecção Nexi (projeto lmsucsoujldyztmumyxd)
-- Rodar no SQL Editor do Supabase. Aplica isolamento por agente_id em
-- todas as tabelas que guardam dado do agente (defesa em profundidade —
-- o código já filtra por agente_id, isto garante mesmo se um filtro
-- futuro esquecer o .eq()).

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

-- pt_clientes_meta
ALTER TABLE pt_clientes_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_proprio" ON pt_clientes_meta
  FOR SELECT USING (agente_id = auth.uid()::text);

CREATE POLICY "all_proprio" ON pt_clientes_meta
  FOR ALL USING (agente_id = auth.uid()::text)
  WITH CHECK (agente_id = auth.uid()::text);

-- pt_preferencias
ALTER TABLE pt_preferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_proprio_pref" ON pt_preferencias
  FOR SELECT USING (agente_id = auth.uid()::text);

CREATE POLICY "all_proprio_pref" ON pt_preferencias
  FOR ALL USING (agente_id = auth.uid()::text)
  WITH CHECK (agente_id = auth.uid()::text);

-- app_secrets — cofre de tokens. Sem policy nenhuma = só service_role acessa
-- (service_role sempre bypassa RLS). anon/authenticated ficam bloqueados
-- mesmo tendo a NEXT_PUBLIC_SUPABASE_ANON_KEY, que é pública no bundle JS.
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;
