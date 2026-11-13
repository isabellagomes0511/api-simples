UPDATE `usuarios`
SET `senha_hash` = CONCAT('!disabled!', REPLACE(UUID(), '-', ''), SHA2(UUID(), 256))
WHERE `senha_hash` NOT LIKE '$2a$%'
  AND `senha_hash` NOT LIKE '$2b$%'
  AND `senha_hash` NOT LIKE '$2y$%';
