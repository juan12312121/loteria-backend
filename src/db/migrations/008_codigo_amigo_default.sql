-- Las cuentas nuevas también necesitan su código de amigo
ALTER TABLE usuarios ALTER COLUMN codigo_amigo SET DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
UPDATE usuarios SET codigo_amigo = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)) WHERE codigo_amigo IS NULL;
ALTER TABLE usuarios ALTER COLUMN codigo_amigo SET NOT NULL;
