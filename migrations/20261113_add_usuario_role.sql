ALTER TABLE `usuarios`
  ADD COLUMN `role` ENUM('admin', 'operador') NOT NULL DEFAULT 'operador' AFTER `senha_hash`;
