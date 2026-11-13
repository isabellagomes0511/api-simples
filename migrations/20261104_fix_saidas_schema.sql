-- Run once on databases where `saidas.id_saida` is not yet a primary auto-increment key.
ALTER TABLE `saidas`
  ADD PRIMARY KEY (`id_saida`),
  MODIFY `id_saida` int(11) NOT NULL AUTO_INCREMENT,
  ADD KEY `fk_saidas_produtos` (`id_produto`),
  ADD KEY `fk_saidas_funcionario` (`id_funcionario`),
  ADD CONSTRAINT `fk_saidas_produtos`
    FOREIGN KEY (`id_produto`) REFERENCES `produtos` (`id_produto`),
  ADD CONSTRAINT `fk_saidas_funcionario`
    FOREIGN KEY (`id_funcionario`) REFERENCES `funcionarios` (`id_funcionario`);
