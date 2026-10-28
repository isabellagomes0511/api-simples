# API Simples

API REST para apoiar a gestão de uma loja, centralizando cadastros, pedidos e
movimentações de estoque em um banco de dados MySQL. A aplicação foi construída
com Node.js e Express e troca dados principalmente no formato JSON.

## Funcionalidades

- Cadastro e manutenção de usuários, com senha armazenada usando bcrypt.
- Login de usuários por e-mail e senha.
- Cadastro e manutenção de funcionários, clientes, fornecedores e categorias.
- Cadastro e consulta de produtos, incluindo associação com categorias.
- Registro e consulta de entradas e saídas de produtos.
- Consulta de saldo de estoque e configuração de níveis mínimo/máximo e localização.
- Registro do histórico de preços quando um produto é criado ou seu preço muda.
- Criação e manutenção de pedidos e itens, com preço unitário e subtotal.

## Tecnologias

- Node.js e Express
- MySQL
- bcryptjs para hash e verificação de senhas
- CORS para permitir requisições de aplicações cliente

## Execução

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente em `.env`:

   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=seu_usuario
   DB_PASSWORD=sua_senha
   DB_NAME=nome_do_banco
   ```

3. Crie o banco e as tabelas usando o esquema SQL fornecido no projeto.
4. Inicie o servidor:

   ```bash
   npm start
   ```

Por padrão, o servidor escuta na porta `5000` e em todas as interfaces de rede.
O endpoint `GET /teste` pode ser usado para verificar se a API está respondendo.

## Endpoints

Todos os recursos abaixo usam o prefixo indicado. Para rotas de coleção, `/{id}`
representa o identificador do registro. Os corpos das requisições de escrita
devem ser enviados em JSON.

| Prefixo | Métodos e caminhos | Objetivo |
|---|---|---|
| `/usuario` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` | Consultar, criar, atualizar e desativar usuários. |
| `/usuario` | `POST /login` | Validar e-mail e senha e retornar os dados públicos do usuário ativo. |
| `/funcionario` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` | Consultar, criar, atualizar e desativar funcionários. |
| `/categorias` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` | Manter categorias de produtos. |
| `/clientes` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` | Manter clientes. |
| `/fornecedores` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` | Manter fornecedores. |
| `/produtos` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` | Consultar, criar, atualizar e excluir produtos. |
| `/estoque` | `GET /`, `GET /:idProduto`, `PATCH /:idProduto` | Consultar saldo e configurar parâmetros do estoque de um produto. |
| `/entradas` | `GET /`, `GET /:id`, `POST /` | Consultar e registrar entradas; uma entrada soma a quantidade ao estoque. |
| `/saidas` | `GET /`, `GET /:id`, `POST /` | Consultar e registrar saídas, validando disponibilidade de estoque. |
| `/historico-precos` | `GET /`, `GET /:idProduto` | Consultar o histórico de preços geral ou de um produto. |
| `/pedidos` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id` | Consultar, criar e atualizar pedidos. |
| `/pedidos` | `GET /:id/itens`, `POST /:id/itens`, `PATCH /:id/itens/:idItem`, `DELETE /:id/itens/:idItem` | Consultar e manter os itens de um pedido. |
| `/` | `GET /teste` | Verificar a disponibilidade básica da API. |

Nos recursos de usuários, funcionários, clientes, fornecedores e categorias, a
rota `DELETE` desativa o registro quando aplicável, em vez de removê-lo
fisicamente. A exclusão de produtos e de itens de pedido é física.

## Exemplos

Login:

```http
POST /usuario/login
Content-Type: application/json
```

```json
{
  "email": "usuario@exemplo.com",
  "senha": "sua-senha"
}
```

Criação de pedido com itens:

```http
POST /pedidos
Content-Type: application/json
```

```json
{
  "id_cliente": 1,
  "itens": [
    {
      "id_produto": 2,
      "quantidade": 3
    }
  ]
}
```

O preço unitário dos itens do pedido é obtido do preço atual do produto no
momento da inclusão.

## Respostas e erros

As respostas são JSON, exceto operações que retornam `204 No Content`. Em geral,
as rotas retornam `200` para consultas e atualizações, `201` para criações,
`400` para dados inválidos, `404` para registros inexistentes, `409` para
conflitos como estoque insuficiente e `500` para erros internos. Um caminho não
reconhecido retorna `404`.

## Observações sobre autenticação

`POST /usuario/login` confere as credenciais e retorna os dados do usuário, mas
não gera token nem cria sessão. As demais rotas não exigem autenticação no
código atual; portanto, o login não restringe o acesso aos recursos da API.
