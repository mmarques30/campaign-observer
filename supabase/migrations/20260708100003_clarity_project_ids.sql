-- Vincula o clarity_project_id correto (tag real de cada página) às LPs.
-- Antes, várias LPs compartilhavam o mesmo id (errado) e liam 0 sessão pra URL delas.
UPDATE mads_lps SET clarity_project_id = 'wpgxq27fhi' WHERE nome = 'Business v1';
UPDATE mads_lps SET clarity_project_id = 'xggoupkuk8' WHERE nome = 'Business v2';
UPDATE mads_lps SET clarity_project_id = 'xggp972x2l' WHERE nome = 'Business v3';
UPDATE mads_lps SET clarity_project_id = 'x291ty5740' WHERE nome = 'LP Contábil v1';
