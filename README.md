# API Simples

## Nome, objetivo e problema resolvido

A **API Simples** é uma API REST para apoiar a gestão de uma loja. Ela centraliza
cadastros de usuários, funcionários, clientes, fornecedores, categorias e
produtos, além de pedidos e movimentações de estoque. Com esses recursos, a
aplicação cliente pode consultar e registrar as operações da loja por meio de
requisições HTTP, evitando que cada cliente implemente sua própria integração
com o banco de dados.

## Tecnologias e banco de dados

- **Backend:** Node.js e Express.
- **Frontend:** login e dashboard em PHP, hospedados separadamente da API.
- **Banco de dados:** MySQL.
- **Segurança:** JWT para autenticação, bcrypt para senhas, Helmet para
  cabeçalhos HTTP, limite de tentativas de login e CORS configurável.
- **Banco/migrações:** consultas MySQL parametrizadas e migrações SQL executadas
  pelo comando `npm run db:migrate`.

## Pré-requisitos

- Node.js 20 LTS ou superior e npm instalados.
- PHP 8.1 ou superior para executar o frontend.
- MySQL acessível a partir da máquina onde a API será executada.
- Um banco de dados criado e contas MySQL separadas para a aplicação e para
  executar migrações.

## Instalação e configuração

1. Abra um terminal na pasta do projeto e instale as dependências:

   ```bash
   npm install
   ```

2. Crie o banco MySQL. Para desenvolvimento, importe
   `isabellagomes_loja_oficial.sql` (inclui dados de demonstração); para
   produção, importe somente `isabellagomes_loja_esquema.sql`, que não contém
   registros de exemplo. Não use dados do dump de demonstração em produção.
3. Copie `.env.example` para `.env`, configure as variáveis e substitua
   `JWT_SECRET` por um valor aleatório. Nunca reutilize os valores ilustrativos
   do arquivo de exemplo.
4. Execute as migrações:

   ```bash
   npm run db:migrate
   ```

5. Crie o primeiro administrador usando as variáveis
   `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME` e
   `BOOTSTRAP_ADMIN_PASSWORD` fornecidas pelo gerenciador de segredos do ambiente:

   ```bash
   npm run admin:create
   ```

   A senha precisa ter de 12 a 72 bytes. O comando cria ou promove a conta do
   e-mail indicado para administrador e redefine a senha dessa conta; não use
   um endereço já pertencente a outra pessoa.
6. Inicie a API:

   ```bash
   npm start
   ```

   Em desenvolvimento, `npm run dev` inicia o servidor com reinicialização
   automática ao detectar alterações.

O servidor usa a porta `5000` por padrão e escuta na rede. Em produção, deixe-o
atrás de um proxy reverso com HTTPS e não exponha diretamente a porta da API.
O processo só inicia depois de conseguir conectar ao MySQL.

## Variáveis de ambiente

Crie um arquivo `.env` local (não o adicione ao controle de versão) com as
variáveis abaixo. Substitua os exemplos pelos valores do seu ambiente e não
divulgue senhas ou outros segredos:

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=nome_do_banco
DB_SSL_CA=
JWT_SECRET=gere-um-segredo-aleatorio-com-pelo-menos-32-bytes
CORS_ORIGINS=http://localhost:3000
TRUST_PROXY=
```

`PORT` e `DB_PORT` são opcionais (padrões `5000` e `3306`). `JWT_SECRET` é
obrigatória e deve ter pelo menos 32 bytes. Gere um valor forte com:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

`CORS_ORIGINS` é uma lista separada por vírgulas, sem barra final. Em produção,
defina os domínios HTTPS autorizados quando houver frontend; curingas não são
usados. Se ficar vazia, nenhum site no navegador recebe permissão CORS, mas a
API pode ser chamada por clientes sem navegador, como outros servidores e
ferramentas de teste.
`TRUST_PROXY` é opcional; informe o número exato de proxies confiáveis somente
quando a API estiver atrás deles. Em produção, `DB_PASSWORD` também é
obrigatória. Para um MySQL gerenciado que exija TLS, defina `DB_SSL_CA` com o
caminho para o certificado CA fornecido pelo provedor.

Nunca compartilhe nem envie o `.env` ao controle de versão. O arquivo está
incluído no `.gitignore`.

### Migrações e atualização de bancos existentes

Sempre use `npm run db:migrate` em vez de executar arquivos SQL manualmente. O
comando registra migrações aplicadas e evita reaplicar a correção antiga da
tabela `saidas` quando o esquema já a contém. Faça backup e teste a migração em
uma cópia antes de atualizar um banco com dados reais.

Versões anteriores do dump incluíam contas com senhas legadas em texto simples;
essas linhas foram removidas. Faça backup antes de migrar uma base existente: a
migração substitui senhas que não sejam bcrypt por valores inutilizáveis, e as
contas afetadas precisarão de uma nova senha definida por um administrador. A
migração atribui o perfil `operador` às contas existentes.

## Iniciar e verificar a API

Depois de executar `npm start`, abra outro terminal e faça uma requisição de
verificação:

```powershell
Invoke-RestMethod -Uri "http://localhost:5000/teste" -Method Get
```

O resultado esperado é `mensagem : Tudo OK` (HTTP `200`). A porta pode ser
alterada com `PORT`; nesse caso, substitua `5000` nos exemplos pelo valor
configurado. `GET /teste` pode ser aberto diretamente na barra de endereços do
navegador. Para requisições `POST`, `PATCH` e `DELETE`, use PowerShell,
Postman, Insomnia ou outro cliente HTTP; navegar para a URL não envia esses
métodos nem o corpo JSON necessário.

O frontend PHP fica na pasta `frontend-php` e é hospedado separadamente da API.
Consulte “Executar o frontend PHP” para iniciá-lo localmente. O login usa a API
e guarda o token somente na sessão do servidor PHP; a página `dashboard.php`
exige sessão válida.

## Executar o frontend PHP localmente

Use PHP 8.1 ou superior. Com a API em execução e `API_BASE_URL` não definida, o
frontend usa `http://127.0.0.1:5000`. Em um segundo terminal PowerShell, inicie o
servidor do frontend:

```powershell
$env:API_BASE_URL = "http://127.0.0.1:5000"
& "C:\xampp\php\php.exe" -S 127.0.0.1:8000 -t "C:\www\frontend-php"
```

Se PHP estiver instalado em outro local, substitua o caminho para `php.exe`.
Abra `http://127.0.0.1:8000` no navegador e entre com uma conta existente no
banco. Para hospedar o frontend separadamente em produção, configure
`API_BASE_URL` no ambiente do PHP com a URL HTTPS correta da API; não use o
endereço local como URL de produção.

## Rotas

Os caminhos abaixo são relativos à URL base da API. `:id`, `:idProduto` e
`:idItem` representam identificadores. Exceto login, saúde da API e
`/teste`, todas as rotas exigem `Authorization: Bearer <token>`.

| Caminho | Método | Finalidade |
|---|---|---|
| `/teste` | `GET` | Verificar se a API está respondendo. |
| `/health/live` | `GET` | Verificação pública de vida do processo. |
| `/health/ready` | `GET` | Verificação pública de disponibilidade do banco. |
| `/usuario` | `GET` | Listar usuários, sem incluir hashes de senha. |
| `/usuario/:id` | `GET` | Consultar um usuário pelo identificador. |
| `/usuario` | `POST` | Cadastrar usuário; somente administrador; armazena senha com bcrypt. |
| `/usuario/login` | `POST` | Validar e-mail/senha bcrypt e emitir JWT. |
| `/usuario/:id` | `PATCH` | Atualizar campos do usuário. |
| `/usuario/:id` | `DELETE` | Desativar usuário. |
| `/funcionario` | `GET`, `POST` | Listar ou cadastrar funcionários. |
| `/funcionario/:id` | `GET`, `PATCH`, `DELETE` | Consultar, atualizar ou desativar funcionário. |
| `/categorias` | `GET`, `POST` | Listar ou cadastrar categorias. |
| `/categorias/:id` | `GET`, `PATCH`, `DELETE` | Consultar, atualizar ou desativar categoria. |
| `/clientes` | `GET`, `POST` | Listar ou cadastrar clientes. |
| `/clientes/:id` | `GET`, `PATCH`, `DELETE` | Consultar, atualizar ou desativar cliente. |
| `/fornecedores` | `GET`, `POST` | Listar ou cadastrar fornecedores. |
| `/fornecedores/:id` | `GET`, `PATCH`, `DELETE` | Consultar, atualizar ou desativar fornecedor. |
| `/produtos` | `GET`, `POST` | Listar ou cadastrar produtos. Ao cadastrar com preço, registra o histórico de preço. |
| `/produtos/:id` | `GET`, `PATCH`, `DELETE` | Consultar, atualizar ou excluir produto; alteração do preço registra o histórico. |
| `/estoque` | `GET` | Listar saldo e parâmetros de estoque. |
| `/estoque/:idProduto` | `GET`, `PATCH` | Consultar saldo ou atualizar mínimo, máximo e localização do estoque de um produto. |
| `/entradas` | `GET`, `POST` | Listar entradas ou registrar entrada que incrementa o estoque. |
| `/entradas/:id` | `GET` | Consultar uma entrada. |
| `/saidas` | `GET`, `POST` | Listar saídas ou registrar saída após validar produto, funcionário e saldo disponível. |
| `/saidas/:id` | `GET` | Consultar uma saída. |
| `/historico-precos` | `GET` | Consultar o histórico de preços geral. |
| `/historico-precos/:idProduto` | `GET` | Consultar o histórico de preço de um produto. |
| `/pedidos` | `GET`, `POST` | Listar ou criar pedidos com ao menos um item. Os itens usam o preço atual dos produtos. |
| `/pedidos/:id` | `GET`, `PATCH` | Consultar pedido e itens ou atualizar dados do pedido. |
| `/pedidos/:id/itens` | `GET`, `POST` | Listar itens do pedido ou adicionar um item. |
| `/pedidos/:id/itens/:idItem` | `PATCH`, `DELETE` | Alterar quantidade ou excluir item do pedido. |

Somente `admin` pode consultar ou alterar usuários e funcionários (inclusive
salários). `operador` pode acessar as demais rotas de loja. O token expira em 15
minutos; após isso, faça login novamente. A API limita tentativas de login por
IP.

`DELETE` desativa usuários, funcionários, clientes, fornecedores e categorias.
A exclusão de produtos e de itens de pedido é física. Entradas atualizam o
estoque pela rota; saídas dependem também do gatilho `trg_saida_estoque` criado
pelo esquema SQL para descontar a quantidade.

## Formato das requisições e respostas

As rotas de escrita recebem `Content-Type: application/json` e um objeto JSON.
Exemplo de cadastro de usuário (requer token de administrador):

```http
POST /usuario
Content-Type: application/json
Authorization: Bearer <token-de-administrador>
```

```json
{
  "nome": "Nome de Exemplo",
  "email": "usuario@exemplo.com",
  "senha": "uma-senha-segura",
  "contato": "11999999999",
  "genero": "M"
}
```

`nome`, `email` e `senha` são obrigatórios no cadastro; o e-mail deve ser
válido e a senha deve conter de 12 a 72 bytes. `contato` e `genero` são
opcionais. O campo `ativo` é opcional e assume `1` por padrão. O cadastro de
usuários só pode ser realizado por um administrador.

Exemplo de criação de pedido:

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

As respostas são JSON com os dados do recurso, uma mensagem e/ou o identificador
criado, conforme a rota. Por exemplo, o cadastro de usuário responde HTTP `201`
com `mensagem` e `id_usuario`; uma consulta de usuários responde com
`{"usuarios":[...]}`. `DELETE` de produtos e itens de pedido responde `204 No
Content`, sem corpo.

Status comuns:

- `200`: consulta ou atualização concluída.
- `201`: registro criado.
- `204`: exclusão concluída sem conteúdo de resposta.
- `400`: entrada inválida.
- `401`: credenciais inválidas, conta inativa ou token ausente/inválido.
- `403`: token válido sem o perfil exigido.
- `429`: limite de tentativas de login excedido.
- `404`: rota ou registro não encontrado.
- `409`: conflito, como estoque insuficiente ou valor duplicado.
- `500`: erro interno.

## Login e uso do token

Envie `POST /usuario/login` com `Content-Type: application/json` e as
credenciais de uma conta ativa com senha bcrypt:

```json
{
  "email": "admin@exemplo.com",
  "senha": "uma-senha-forte-de-12-caracteres-ou-mais"
}
```

A resposta contém `access_token`, `token_type: "Bearer"`, `expires_in: 900` e
os dados públicos do usuário. Envie o token em todas as outras rotas protegidas:

```powershell
$login = Invoke-RestMethod `
  -Uri "http://localhost:5000/usuario/login" `
  -Method Post `
  -ContentType "application/json" `
  -Body (@{ email = "admin@exemplo.com"; senha = $env:ADMIN_PASSWORD } | ConvertTo-Json)

Invoke-RestMethod `
  -Uri "http://localhost:5000/clientes" `
  -Headers @{ Authorization = "Bearer $($login.access_token)" }
```

O token é assinado com `JWT_SECRET`, usa HS256 e expira após 15 minutos. Faça
login novamente quando expirar. Não registre nem compartilhe tokens. A API
limita o login a cinco tentativas por IP a cada 15 minutos; esse contador fica
em memória e, portanto, é local a cada processo.

## Testes e verificações

Execute `npm test` para verificar os endpoints públicos, bloqueio de acesso sem
token, permissões de cada perfil, emissão do JWT e rejeição de senha legada.
Esses testes não precisam nem acessam um banco de dados. Antes de publicar,
execute também `npm audit --omit=dev` e teste as migrações em uma cópia do banco.

`GET /health/live` verifica se o processo está ativo. `GET /health/ready`
executa `SELECT 1` no MySQL e retorna HTTP `503` se o banco não estiver
disponível. Configure o monitor da hospedagem para usar prontidão e alerte sobre
reinícios, erros HTTP `5xx`, falhas de conexão e espaço de armazenamento.

## Checklist de produção

1. Use uma conta MySQL de runtime restrita ao banco da aplicação. Para uma
   instalação MySQL que suporte `CREATE USER`/`GRANT`, o privilégio de runtime
   pode ser limitado a:

   ```sql
   CREATE USER 'api_runtime'@'10.%' IDENTIFIED BY 'defina-por-secret-manager';
   GRANT SELECT, INSERT, UPDATE, DELETE ON `nome_do_banco`.* TO 'api_runtime'@'10.%';
   ```

   Use outra conta temporária para migrações, com os privilégios DDL necessários
   (`CREATE`, `ALTER`, `INDEX` e `REFERENCES`), e não execute a API com essa
   conta. Restrinja o host de ambas as contas à rede privada da aplicação.
2. Termine TLS em um proxy reverso confiável, configure redirecionamento HTTP
   para HTTPS e exponha publicamente apenas as portas do proxy. Quando houver
   frontend, defina `CORS_ORIGINS` com suas origens reais. Configure `TRUST_PROXY`
   somente com a quantidade exata de proxies sob seu controle.
3. Faça deploy com `npm ci --omit=dev`; mantenha `JWT_SECRET` e credenciais fora
   do    repositório, em um gerenciador de segredos. Configure `NODE_ENV=production`
   e `DB_PASSWORD`. `CORS_ORIGINS` pode ficar vazio para o frontend PHP, que
   conversa com a API pelo servidor.
4. Execute `npm run db:migrate` com a conta temporária de migração, crie o
   administrador uma única vez com `npm run admin:create` e então configure o
   serviço com a conta MySQL de runtime.
5. Agende backups consistentes, guarde-os criptografados fora do servidor da
   aplicação e faça testes periódicos de restauração. Exemplo que solicita a
   senha sem colocá-la no histórico:

   ```powershell
   mysqldump --single-transaction --routines --triggers `
     --host=$env:DB_HOST --user=backup_user --password `
     --result-file="C:\backups\api-simples.sql" $env:DB_NAME
   ```

6. Colete logs e alertas centralizados. Não exponha o processo Node diretamente
   à Internet. O limitador de login atual é em memória; para múltiplas réplicas,
   configure um armazenamento compartilhado de rate limit antes de escalar.

## Executar o frontend PHP

O frontend está em `frontend-php` e requer PHP 8.1 ou superior com as extensões
JSON e OpenSSL habilitadas e `allow_url_fopen=On` (a configuração padrão do
PHP). Ele não usa Node, npm ou um banco próprio. Primeiro inicie a API com
`npm start`; em outro terminal PowerShell, configure a URL da API e rode o
servidor de desenvolvimento do PHP:

```powershell
$env:API_BASE_URL = "http://127.0.0.1:5000"
php -S 127.0.0.1:8080 -t frontend-php
```

Abra `http://127.0.0.1:8080/`. Entre com uma conta ativa da API. O dashboard é
protegido por sessão PHP, usa cookie `HttpOnly` e `SameSite=Lax`, e faz chamadas
servidor-a-servidor à API. O JWT não é enviado ao navegador. O logout usa POST
com token CSRF. Em produção, configure `API_BASE_URL` como a URL HTTPS pública
da API e sirva o PHP exclusivamente por HTTPS. O cookie da sessão será marcado
como `Secure` automaticamente quando o PHP receber a requisição HTTPS.

Por padrão, o frontend usa `https://api-simples.onrender.com`; defina
`API_BASE_URL` para `http://127.0.0.1:5000` quando quiser apontar para uma API
local. Para usar o XAMPP no Windows, copie o conteúdo de `frontend-php` para
`C:\xampp\htdocs\frontend` e abra `http://localhost/frontend/`. O PHP do XAMPP
precisa ter `allow_url_fopen` habilitado. O painel oferece consultas e operações
de cadastro, edição e desativação/exclusão para os recursos suportados pela API;
funcionários e usuários ficam disponíveis somente para administradores. Entradas,
saídas, histórico de preços e parâmetros de estoque seguem os métodos disponíveis
em suas rotas.

Se outro serviço estiver ocupando a porta 80 do Windows, inicie o servidor PHP
de desenvolvimento em uma porta livre:

```powershell
& "C:\xampp\php\php.exe" -S 127.0.0.1:8080 -t "C:\xampp\htdocs\frontend"
```

Nesse caso, abra `http://127.0.0.1:8080/`.

### Publicar o frontend PHP

O serviço do Render configurado neste repositório executa somente a API Node;
ele não executa PHP. O frontend foi desenvolvido em PHP e deve ser servido como
site PHP, não como site de arquivos estáticos. No AlwaysData:

1. No painel, abra **Web > Sites > Add a site**, escolha o tipo **PHP** e
   associe o endereço público desejado. Configure a raiz do site para a pasta
   onde os arquivos do pacote serão colocados.
2. Em **Environment > PHP** (ou na configuração PHP do site), selecione PHP 8.1
   ou superior e deixe `allow_url_fopen = On`. JSON, OpenSSL e mbstring são
   necessários; estão habilitados por padrão nas versões PHP documentadas pelo
   AlwaysData.
3. Baixe `frontend-alwaysdata.zip` dos artefatos desta entrega, extraia o
   conteúdo diretamente para a raiz pública configurada no site (o `index.php`
   e o `.htaccess` devem ficar nessa raiz). Alternativamente, envie os arquivos
   de `frontend-php` por SFTP para a mesma pasta. Os dados SFTP estão em
   **Remote access > SSH/SFTP** no painel AlwaysData; nunca os compartilhe.
4. O `.htaccess` incluído define `API_BASE_URL` como
   `https://api-simples.onrender.com`. Se a API mudar, atualize essa linha no
   `.htaccess` do site. Não coloque credenciais no frontend.
5. Ative SSL para o endereço do site e marque **Force HTTPS** em
   **Web > Sites > Modify the site > SSL**.
6. Abra o domínio HTTPS do site. Teste login com uma conta ativa e, após
   autenticar, teste as operações autorizadas ao perfil.

O painel PHP faz chamadas à API do lado do servidor; não requer CORS para o
domínio AlwaysData. `allow_url_fopen` é necessário para essas chamadas. O
pacote pode ser preparado com:

```powershell
Compress-Archive -Path frontend-php\* -DestinationPath frontend-alwaysdata.zip -Force
```

Também é possível configurar `API_BASE_URL` como variável de ambiente do PHP;
o frontend consulta essa variável antes de usar o valor definido no `.htaccess`
ou a URL padrão.

Antes de liberar o site, confirme que:

1. A API está publicada, com o banco configurado, e responde em
   `https://api-simples.onrender.com/health/ready`.
2. `API_BASE_URL` está configurada na hospedagem PHP para a URL real da API.
3. O domínio do site abre a página de login por HTTPS; uma credencial inválida
   mostra erro, enquanto uma credencial válida redireciona a
   `dashboard.php`.
4. Abrir `dashboard.php` em uma sessão anônima redireciona ao login e o botão
   de saída encerra a sessão.

Não é necessário configurar CORS para essa integração: o navegador só acessa
o site PHP, e o servidor PHP acessa a API. CORS só é necessário se o navegador
chamar a API diretamente; nesse caso, preencha `CORS_ORIGINS` com as origens
HTTPS exatas do frontend.

## Publicar no Render

O repositório inclui [render.yaml](./render.yaml) para configurar a API Node como
Blueprint. O PHP não é executado por esse serviço Node: publique o conteúdo da
pasta `frontend-php` em uma hospedagem com PHP 8.1 ou superior. Configure
`API_BASE_URL` no painel dessa hospedagem com a URL HTTPS da API publicada no
Render. Os passos completos estão em “Publicar o frontend PHP”. O PHP faz as
chamadas à API do lado do servidor; não adicione a URL do site PHP em
`CORS_ORIGINS` por causa dessa integração.

No painel do Render, crie um Blueprint para este repositório; o Render pedirá
os valores de `DB_HOST`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`, além de gerar
automaticamente `JWT_SECRET`. Informe os dados de uma instância MySQL já criada
e acessível pelo serviço. Segredos devem ser inseridos apenas no painel do
Render, nunca no arquivo YAML ou no repositório.

Como alternativa, crie manualmente um [**Web Service** com runtime Node](https://render.com/docs/deploy-node-express-app)
e use os valores:

- **Build Command:** `npm ci --omit=dev`
- **Start Command:** `npm start`
- **Health Check Path:** `/health/ready`

O serviço lê a porta da variável `PORT` fornecida pelo Render e já escuta em
`0.0.0.0`. Selecione Node `24.x` (ou uma versão suportada pelo campo `engines`
do `package.json`). O Blueprint configura `NODE_ENV`, `DB_PORT`, `JWT_SECRET` e
`TRUST_PROXY`; os demais valores do banco são solicitados durante a
configuração. `PORT` é definido pelo Render e não deve ser cadastrado
manualmente. Se o provedor MySQL exigir TLS, adicione no painel a variável
`DB_SSL_CA` apontando para um secret file com a CA.

No deploy manual, configure no painel do serviço da API:

- `NODE_ENV=production`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` do MySQL
- `JWT_SECRET` aleatório e exclusivo para este ambiente
- `CORS_ORIGINS` vazio para o frontend PHP servidor-a-servidor. Se outro
  frontend chamar a API diretamente pelo navegador, configure aqui as origens
  HTTPS exatas desse frontend.
- `TRUST_PROXY=1` para a topologia padrão de um proxy do Render; ajuste apenas
  se houver proxies adicionais sob seu controle
- Opcionalmente, `DB_SSL_CA=/etc/secrets/mysql-ca.pem` se o provedor do banco
  exigir TLS com certificado CA. No Render, arquivos secretos ficam em
  `/etc/secrets`.

O Render oferece Web Services e documenta a execução de MySQL próprio como
**[Private Service](https://render.com/docs/deploy-mysql)** com um [disco persistente](https://render.com/docs/disks)
montado em `/var/lib/mysql`; também
oferece Postgres gerenciado, mas esta API usa MySQL e não conecta diretamente a
Postgres. Para operação com dados reais, use MySQL gerenciado externo ou
configure e mantenha seu próprio serviço MySQL privado. Não exponha a porta do
banco publicamente. Se hospedar MySQL no Render, use `mysqldump` para backup e
restauração; não use snapshots do disco como substituto de backup do banco.

Configure variáveis e arquivos secretos pelo [painel de ambiente do Render](https://render.com/docs/configure-environment-variables)
e use `/health/ready` como [HTTP health check](https://render.com/docs/health-checks).

Antes de liberar tráfego, importe o schema sem dados de exemplo, execute
`npm run db:migrate` e `npm run admin:create` em um ambiente com acesso privado
ao banco, e configure depois a conta restrita de runtime no Web Service. O
Render exige que os health checks HTTP respondam em até cinco segundos; o
endpoint de readiness valida também a conexão MySQL.
