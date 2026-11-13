<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
require_login();

$user = $_SESSION['user'];
$token = (string) $_SESSION['api_token'];
$resourceKey = is_string($_GET['r'] ?? null) ? $_GET['r'] : '';
$definitions = [
    'produtos' => [
        'title' => 'Produtos', 'path' => '/produtos', 'response' => 'produtos', 'id' => 'id_produto',
        'columns' => ['id_produto' => 'Código', 'nome' => 'Produto', 'categoria_nome' => 'Categoria', 'preco' => 'Preço', 'descricao' => 'Descrição'],
        'fields' => [
            ['nome', 'Nome', 'text', true], ['descricao', 'Descrição', 'textarea', true],
            ['preco', 'Preço', 'decimal'], ['imagem_produto', 'URL da imagem', 'url', true],
            ['id_categoria', 'ID da categoria (opcional)', 'integer'],
        ],
    ],
    'clientes' => [
        'title' => 'Clientes', 'path' => '/clientes', 'response' => 'clientes', 'id' => 'id_cliente',
        'columns' => ['id_cliente' => 'Código', 'nome' => 'Nome', 'email' => 'E-mail', 'contato' => 'Contato', 'ativo' => 'Ativo'],
        'fields' => [
            ['nome', 'Nome', 'text', true], ['email', 'E-mail', 'email', true], ['contato', 'Contato', 'text'],
        ],
    ],
    'categorias' => [
        'title' => 'Categorias', 'path' => '/categorias', 'response' => 'categorias', 'id' => 'id_categoria',
        'columns' => ['id_categoria' => 'Código', 'nome' => 'Categoria', 'descricao' => 'Descrição', 'ativo' => 'Ativa'],
        'fields' => [
            ['nome', 'Nome', 'text', true], ['descricao', 'Descrição', 'textarea'],
        ],
    ],
    'fornecedores' => [
        'title' => 'Fornecedores', 'path' => '/fornecedores', 'response' => 'fornecedores', 'id' => 'id_fornecedor',
        'columns' => ['id_fornecedor' => 'Código', 'nome' => 'Nome', 'empresa' => 'Empresa', 'email' => 'E-mail', 'telefone' => 'Telefone', 'cidade' => 'Cidade', 'estado' => 'Estado', 'ativo' => 'Ativo'],
        'fields' => [
            ['nome', 'Nome', 'text', true], ['empresa', 'Empresa', 'text'], ['email', 'E-mail', 'email'],
            ['telefone', 'Telefone', 'text'], ['cidade', 'Cidade', 'text'], ['estado', 'Estado', 'text'],
        ],
    ],
    'funcionarios' => [
        'title' => 'Funcionários', 'path' => '/funcionario', 'response' => 'funcionarios', 'id' => 'id_funcionario', 'admin' => true,
        'columns' => ['id_funcionario' => 'Código', 'nome' => 'Nome', 'cargo' => 'Cargo', 'salario' => 'Salário', 'telefone' => 'Telefone', 'email' => 'E-mail', 'ativo' => 'Ativo'],
        'fields' => [
            ['nome', 'Nome', 'text', true], ['cargo', 'Cargo', 'text', true], ['salario', 'Salário', 'decimal', true],
            ['telefone', 'Telefone', 'text'], ['email', 'E-mail', 'email'], ['data_admissao', 'Data de admissão', 'date'],
        ],
    ],
    'usuarios' => [
        'title' => 'Usuários', 'path' => '/usuario', 'response' => 'usuarios', 'id' => 'id_usu', 'admin' => true,
        'columns' => ['id_usu' => 'Código', 'nome' => 'Nome', 'email' => 'E-mail', 'role' => 'Perfil', 'ativo' => 'Ativo'],
        'fields' => [
            ['nome', 'Nome', 'text', true], ['email', 'E-mail', 'email', true], ['senha', 'Senha (mínimo 12 caracteres)', 'password', true],
            ['contato', 'Contato', 'text'], ['genero', 'Gênero', 'text'],
            ['role', 'Perfil', 'select', false, ['operador' => 'Operador', 'admin' => 'Administrador']],
        ],
    ],
    'entradas' => [
        'title' => 'Entradas de estoque', 'path' => '/entradas', 'response' => 'entradas', 'id' => 'id_entrada', 'createOnly' => true,
        'columns' => ['id_entrada' => 'Código', 'produto_nome' => 'Produto', 'fornecedor_nome' => 'Fornecedor', 'quantidade' => 'Quantidade', 'valor_unitario' => 'Valor unitário', 'data_entrada' => 'Data'],
        'fields' => [
            ['id_produto', 'ID do produto', 'integer', true], ['id_fornecedor', 'ID do fornecedor', 'integer', true],
            ['quantidade', 'Quantidade', 'integer', true], ['valor_unitario', 'Valor unitário', 'decimal', true],
            ['data_entrada', 'Data', 'date'], ['observacao', 'Observação', 'text'],
        ],
    ],
    'saidas' => [
        'title' => 'Saídas de estoque', 'path' => '/saidas', 'response' => 'saidas', 'id' => 'id_saida', 'createOnly' => true,
        'columns' => ['id_saida' => 'Código', 'produto_nome' => 'Produto', 'funcionario_nome' => 'Funcionário', 'quantidade' => 'Quantidade', 'valor_unitario' => 'Valor unitário', 'data_saida' => 'Data', 'destino' => 'Destino'],
        'fields' => [
            ['id_produto', 'ID do produto', 'integer', true], ['id_funcionario', 'ID do funcionário', 'integer', true],
            ['quantidade', 'Quantidade', 'integer', true], ['valor_unitario', 'Valor unitário', 'decimal', true],
            ['data_saida', 'Data', 'date'], ['destino', 'Destino', 'text'],
        ],
    ],
    'estoque' => [
        'title' => 'Estoque', 'path' => '/estoque', 'response' => 'estoque', 'id' => 'id_produto', 'updateOnly' => true,
        'columns' => ['id_produto' => 'Código', 'produto_nome' => 'Produto', 'quantidade' => 'Quantidade', 'estoque_minimo' => 'Mínimo', 'estoque_maximo' => 'Máximo', 'localizacao' => 'Localização'],
        'fields' => [
            ['estoque_minimo', 'Estoque mínimo', 'integer-null'], ['estoque_maximo', 'Estoque máximo', 'integer-null'],
            ['localizacao', 'Localização', 'text'],
        ],
    ],
    'historico-precos' => [
        'title' => 'Histórico de preços', 'path' => '/historico-precos', 'response' => 'historico_precos', 'id' => 'id_historico', 'readOnly' => true,
        'columns' => ['id_historico' => 'Código', 'produto_nome' => 'Produto', 'id_produto' => 'ID do produto', 'preco' => 'Preço', 'vigencia' => 'Vigência'],
    ],
    'pedidos' => [
        'title' => 'Pedidos', 'path' => '/pedidos', 'response' => 'pedidos', 'id' => 'id_pedido',
        'columns' => ['id_pedido' => 'Código', 'cliente_nome' => 'Cliente', 'status' => 'Ativo', 'data_pedido' => 'Data'],
        'fields' => [
            ['id_cliente', 'ID do cliente (opcional)', 'integer-null'], ['data_pedido', 'Data do pedido', 'date'],
            ['status', 'Ativo', 'flag', false, ['1' => 'Sim', '0' => 'Não']],
            ['itens_json', 'Itens do pedido (JSON)', 'textarea', true],
        ],
    ],
];

if (!isset($definitions[$resourceKey])) {
    http_response_code(404);
    exit('Recurso não encontrado.');
}
$definition = $definitions[$resourceKey];
if (($definition['admin'] ?? false) && $user['role'] !== 'admin') {
    http_response_code(403);
    exit('Esta área exige perfil de administrador.');
}

$error = '';
$success = is_string($_GET['ok'] ?? null) ? $_GET['ok'] : '';
$editId = is_string($_GET['edit'] ?? null) ? $_GET['edit'] : '';
$orderId = is_string($_GET['order_id'] ?? null) ? $_GET['order_id'] : '';
$editRecord = [];
$records = [];
$orderItems = [];
$valuesFromForm = [];

function resource_value(array $record, string $key): string
{
    $value = $record[$key] ?? '';
    if (is_array($value) || is_object($value)) {
        return (string) json_encode($value, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
    return (string) $value;
}

function resource_payload(array $fields, array $input): array
{
    $payload = [];
    foreach ($fields as $field) {
        [$name, , $type] = $field;
        if (!array_key_exists($name, $input) || $type === 'password' && $input[$name] === '') {
            continue;
        }
        $value = is_string($input[$name]) ? trim($input[$name]) : $input[$name];
        if ($type === 'integer-null' && $value === '') {
            $payload[$name] = null;
        } elseif ($value !== '') {
            if (in_array($type, ['integer', 'integer-null', 'flag'], true)) {
                $payload[$name] = (int) $value;
            } elseif ($type === 'decimal') {
                $payload[$name] = (float) $value;
            } elseif ($type === 'textarea' && $name === 'itens_json') {
                $decoded = json_decode($value, true);
                if (!is_array($decoded) || json_last_error() !== JSON_ERROR_NONE) {
                    throw new InvalidArgumentException('Informe os itens como um JSON válido.');
                }
                $payload['itens'] = $decoded;
            } else {
                $payload[$name] = $value;
            }
        }
    }
    return $payload;
}

function redirect_resource(string $resourceKey, string $message, string $orderId = ''): never
{
    $query = ['r' => $resourceKey, 'ok' => $message];
    if ($orderId !== '') {
        $query['order_id'] = $orderId;
    }
    header('Location: resource.php?' . http_build_query($query));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = is_string($_POST['_action'] ?? null) ? $_POST['_action'] : '';
    try {
        if ($resourceKey === 'pedidos' && in_array($action, ['item_add', 'item_update', 'item_delete'], true)) {
            $postedOrderId = (string) ($_POST['order_id'] ?? '');
            $itemId = (string) ($_POST['item_id'] ?? '');
            if (!ctype_digit($postedOrderId) || (int) $postedOrderId < 1) {
                throw new InvalidArgumentException('Pedido inválido.');
            }
            if ($action === 'item_add') {
                $payload = resource_payload([['id_produto', '', 'integer'], ['quantidade', '', 'integer']], $_POST);
                api_request('/pedidos/' . $postedOrderId . '/itens', $payload, $token, 'POST');
            } else {
                if (!ctype_digit($itemId) || (int) $itemId < 1) {
                    throw new InvalidArgumentException('Item inválido.');
                }
                $method = $action === 'item_update' ? 'PATCH' : 'DELETE';
                $payload = $action === 'item_update'
                    ? resource_payload([['quantidade', '', 'integer']], $_POST)
                    : null;
                api_request('/pedidos/' . $postedOrderId . '/itens/' . $itemId, $payload, $token, $method);
            }
            redirect_resource($resourceKey, 'Operação do item concluída.', $postedOrderId);
        }

        if ($action === 'delete') {
            $id = is_string($_POST['record_id'] ?? null) ? $_POST['record_id'] : '';
            if (!ctype_digit($id) || (int) $id < 1) {
                throw new InvalidArgumentException('Identificador inválido.');
            }
            api_request($definition['path'] . '/' . $id, null, $token, 'DELETE');
            redirect_resource($resourceKey, 'Registro removido ou desativado com sucesso.');
        }

        if (in_array($action, ['save', 'stock_update'], true)) {
            $id = is_string($_POST['record_id'] ?? null) ? $_POST['record_id'] : '';
            $isUpdate = $action === 'stock_update' || $id !== '';
            if ($isUpdate && (!ctype_digit($id) || (int) $id < 1)) {
                throw new InvalidArgumentException('Identificador inválido.');
            }
            $fields = $definition['fields'] ?? [];
            $valuesFromForm = $_POST;
            $payload = resource_payload($fields, $_POST);
            if ($resourceKey === 'pedidos' && $isUpdate) {
                unset($payload['itens']);
            }
            if ($resourceKey === 'pedidos' && !$isUpdate && !isset($payload['itens'])) {
                throw new InvalidArgumentException('O pedido precisa conter itens.');
            }
            if ($resourceKey === 'estoque') {
                $path = '/estoque/' . $id;
                $method = 'PATCH';
            } else {
                $path = $definition['path'] . ($isUpdate ? '/' . $id : '');
                $method = $isUpdate ? 'PATCH' : 'POST';
            }
            api_request($path, $payload, $token, $method);
            redirect_resource($resourceKey, $isUpdate ? 'Registro atualizado com sucesso.' : 'Registro criado com sucesso.');
        }
        throw new InvalidArgumentException('Operação inválida.');
    } catch (ApiException $exception) {
        if ($exception->statusCode === 401) {
            unset($_SESSION['api_token'], $_SESSION['token_expires_at'], $_SESSION['user']);
            header('Location: index.php');
            exit;
        }
        $error = $exception->getMessage();
    } catch (InvalidArgumentException $exception) {
        $error = $exception->getMessage();
    } catch (RuntimeException $exception) {
        $error = $exception->getMessage();
    }
}

try {
    $listPath = $definition['path'];
    if ($resourceKey === 'historico-precos' && isset($_GET['produto']) && ctype_digit((string) $_GET['produto']) && (int) $_GET['produto'] > 0) {
        $listPath .= '/' . (int) $_GET['produto'];
    }
    $listResult = api_request($listPath, null, $token);
    $records = is_array($listResult[$definition['response']] ?? null) ? $listResult[$definition['response']] : [];
    if ($editId !== '' && isset($definition['fields']) && !($definition['readOnly'] ?? false)) {
        $editResult = api_request($definition['path'] . '/' . rawurlencode($editId), null, $token);
        $editRecord = is_array($editResult['pedido'] ?? null)
            ? $editResult['pedido']
            : (is_array($editResult[str_replace('s', '', $definition['response'])] ?? null)
                ? $editResult[str_replace('s', '', $definition['response'])]
                : []);
        foreach (['categoria' => 'categorias', 'cliente' => 'clientes', 'fornecedor' => 'fornecedores', 'produto' => 'produtos', 'funcionario' => 'funcionarios', 'usuario' => 'usuarios'] as $singular => $plural) {
            if ($plural === $definition['response'] && isset($editResult[$singular]) && is_array($editResult[$singular])) {
                $editRecord = $editResult[$singular];
            }
        }
        if ($resourceKey === 'pedidos' && isset($editResult['itens']) && is_array($editResult['itens'])) {
            $orderItems = $editResult['itens'];
        }
        if ($resourceKey === 'estoque' && isset($editResult['estoque']) && is_array($editResult['estoque'])) {
            $editRecord = $editResult['estoque'];
        }
    }
    if ($resourceKey === 'pedidos' && $orderId !== '') {
        $orderResult = api_request('/pedidos/' . rawurlencode($orderId), null, $token);
        $orderItems = is_array($orderResult['itens'] ?? null) ? $orderResult['itens'] : [];
    }
} catch (ApiException $exception) {
    if ($exception->statusCode === 401) {
        unset($_SESSION['api_token'], $_SESSION['token_expires_at'], $_SESSION['user']);
        header('Location: index.php');
        exit;
    }
    $error = $exception->getMessage();
} catch (RuntimeException $exception) {
    $error = $exception->getMessage();
}

$title = $definition['title'];
?>
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f5f6f2">
    <title><?= h($title) ?> · Vitrine</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="dashboard-layout">
    <aside class="sidebar">
        <a class="brand" href="dashboard.php"><span class="brand-mark">V</span><span>vitrine<span class="brand-dot">.</span></span></a>
        <p class="side-label">GESTÃO DA LOJA</p>
        <nav class="navigation" aria-label="Menu principal">
            <?php foreach ([
                'dashboard.php' => ['⌂', 'Dashboard'],
                'resource.php?r=produtos' => ['▧', 'Produtos'],
                'resource.php?r=clientes' => ['♙', 'Clientes'],
                'resource.php?r=pedidos' => ['▣', 'Pedidos'],
                'resource.php?r=estoque' => ['▤', 'Estoque'],
                'resource.php?r=entradas' => ['↓', 'Entradas'],
                'resource.php?r=saidas' => ['↑', 'Saídas'],
                'resource.php?r=categorias' => ['◇', 'Categorias'],
                'resource.php?r=fornecedores' => ['⌂', 'Fornecedores'],
                'resource.php?r=historico-precos' => ['◷', 'Histórico de preços'],
            ] as $href => [$icon, $label]): ?>
                <a class="nav-item <?= str_contains($href, 'r=' . $resourceKey) ? 'active' : '' ?>" href="<?= h($href) ?>"><span class="nav-icon"><?= h($icon) ?></span><?= h($label) ?></a>
            <?php endforeach; ?>
            <?php if ($user['role'] === 'admin'): ?>
                <a class="nav-item <?= $resourceKey === 'funcionarios' ? 'active' : '' ?>" href="resource.php?r=funcionarios"><span class="nav-icon">♧</span>Funcionários</a>
                <a class="nav-item <?= $resourceKey === 'usuarios' ? 'active' : '' ?>" href="resource.php?r=usuarios"><span class="nav-icon">♙</span>Usuários</a>
            <?php endif; ?>
        </nav>
        <div class="sidebar-bottom">
            <div class="avatar"><?= h(preg_match('/^./u', $user['nome'] ?: 'V', $initial) ? $initial[0] : 'V') ?></div>
            <div class="user-summary"><strong><?= h($user['nome'] ?: $user['email']) ?></strong><small><?= h($user['role'] === 'admin' ? 'Administrador' : 'Operador') ?></small></div>
            <form method="post" action="logout.php"><input type="hidden" name="csrf_token" value="<?= h(csrf_token()) ?>"><button class="icon-button" type="submit" aria-label="Sair">↪</button></form>
        </div>
    </aside>
    <main class="main-area">
        <header class="topbar"><div class="breadcrumb"><a href="dashboard.php">Vitrine</a><span class="breadcrumb-sep">/</span><strong><?= h($title) ?></strong></div><div class="topbar-right"><span class="status-dot"></span><span>Área restrita</span></div></header>
        <section class="page-content">
            <div class="page-heading"><div><p class="eyebrow">GESTÃO DA LOJA</p><h1><?= h($title) ?></h1><p>Consulte e gerencie os dados diretamente pela API.</p></div><span class="date-label"><?= h(date('d/m/Y')) ?></span></div>
            <?php if ($success !== ''): ?><div class="notice" role="status"><?= h($success) ?></div><?php endif; ?>
            <?php if ($error !== ''): ?><div class="notice notice-error" role="alert"><?= h($error) ?></div><?php endif; ?>

            <?php if (isset($definition['fields']) && !($definition['readOnly'] ?? false)): ?>
                <?php
                $showForm = isset($definition['fields']) && !($definition['readOnly'] ?? false)
                    && (!($definition['updateOnly'] ?? false) || $editId !== '' || ($_POST['_action'] ?? '') === 'stock_update')
                    && (!($definition['createOnly'] ?? false) || $editId === '');
                ?>
                <?php if ($showForm): ?>
                    <?php
                    if ($valuesFromForm !== []) {
                        $editRecord = $valuesFromForm;
                    }
                    $isEditing = $editId !== '' || isset($_POST['record_id']);
                    $formId = $editId !== '' ? $editId : (string) ($editRecord['record_id'] ?? '');
                    ?>
                    <section class="resource-card">
                        <div class="resource-toolbar"><h2><?= $isEditing ? 'Editar registro' : 'Novo registro' ?></h2><?php if ($isEditing): ?><a class="button button-secondary" href="resource.php?r=<?= h($resourceKey) ?>">Cancelar edição</a><?php endif; ?></div>
                        <form class="resource-form" method="post" action="resource.php?r=<?= h($resourceKey) ?>">
                            <input type="hidden" name="csrf_token" value="<?= h(csrf_token()) ?>">
                            <input type="hidden" name="_action" value="<?= h(($definition['updateOnly'] ?? false) ? 'stock_update' : 'save') ?>">
                            <?php if ($formId !== ''): ?><input type="hidden" name="record_id" value="<?= h($formId) ?>"><?php endif; ?>
                            <?php foreach ($definition['fields'] as $field): ?>
                                <?php
                                [$name, $label, $type] = $field;
                                if ($resourceKey === 'pedidos' && $isEditing && $name === 'itens_json') {
                                    continue;
                                }
                                $required = (bool) ($field[3] ?? false) && !($isEditing && $type === 'password');
                                $value = resource_value($editRecord, $name);
                                if ($name === 'itens_json' && !$isEditing && $value === '') {
                                    $value = '[{"id_produto": 1, "quantidade": 1}]';
                                }
                                if ($name === 'senha' && $isEditing) {
                                    $value = '';
                                }
                                $htmlType = in_array($type, ['integer', 'integer-null'], true) ? 'number' : ($type === 'decimal' ? 'number' : $type);
                                ?>
                                <label><?= h($label) ?>
                                    <?php if ($type === 'select' || $type === 'flag'): ?>
                                        <select name="<?= h($name) ?>" <?= $required ? 'required' : '' ?>>
                                            <?php foreach ($field[4] as $option => $optionLabel): ?><option value="<?= h($option) ?>" <?= $value !== '' && $value === (string) $option ? 'selected' : '' ?>><?= h($optionLabel) ?></option><?php endforeach; ?>
                                        </select>
                                    <?php elseif ($type === 'textarea'): ?>
                                        <textarea name="<?= h($name) ?>" <?= $required ? 'required' : '' ?> <?= $name === 'itens_json' ? 'spellcheck="false"' : '' ?>><?= h($value) ?></textarea>
                                    <?php else: ?>
                                        <input name="<?= h($name) ?>" type="<?= h($htmlType) ?>" value="<?= h($value) ?>" <?= $required ? 'required' : '' ?> <?= $type === 'integer' ? 'min="1" step="1"' : '' ?> <?= $type === 'integer-null' ? 'min="0" step="1"' : '' ?> <?= $type === 'decimal' ? 'min="0" step="0.01"' : '' ?> <?= $type === 'password' ? 'minlength="12" maxlength="72" autocomplete="new-password"' : '' ?>>
                                    <?php endif; ?>
                                </label>
                            <?php endforeach; ?>
                            <div class="form-actions"><button class="button button-primary" type="submit"><?= $isEditing ? 'Salvar alterações' : 'Cadastrar' ?></button></div>
                        </form>
                        <?php if ($resourceKey === 'pedidos' && $isEditing): ?><p class="muted-note">Edite cliente e status separadamente dos itens; o preço dos itens usa o preço atual do produto.</p><?php endif; ?>
                    </section>
                <?php endif; ?>
            <?php endif; ?>

            <?php if ($resourceKey === 'pedidos' && $orderId !== ''): ?>
                <section class="resource-card">
                    <div class="resource-toolbar"><h2>Itens do pedido #<?= h($orderId) ?></h2><a href="resource.php?r=pedidos">Voltar aos pedidos</a></div>
                    <form class="inline-form" method="post" action="resource.php?r=pedidos">
                        <input type="hidden" name="csrf_token" value="<?= h(csrf_token()) ?>"><input type="hidden" name="_action" value="item_add"><input type="hidden" name="order_id" value="<?= h($orderId) ?>">
                        <label>ID do produto<input type="number" name="id_produto" min="1" required></label><label>Quantidade<input type="number" name="quantidade" min="1" required></label><button class="button button-primary" type="submit">Adicionar item</button>
                    </form>
                    <div class="table-wrap" style="margin-top:16px"><table class="data-table"><thead><tr><th>Item</th><th>Produto</th><th>Quantidade</th><th>Subtotal</th><th>Ações</th></tr></thead><tbody>
                    <?php foreach ($orderItems as $item): ?><tr><td><?= h($item['id_item'] ?? '') ?></td><td><?= h($item['produto_nome'] ?? $item['id_produto'] ?? '') ?></td><td><form class="inline-form" method="post" action="resource.php?r=pedidos"><input type="hidden" name="csrf_token" value="<?= h(csrf_token()) ?>"><input type="hidden" name="_action" value="item_update"><input type="hidden" name="order_id" value="<?= h($orderId) ?>"><input type="hidden" name="item_id" value="<?= h($item['id_item'] ?? '') ?>"><input type="number" name="quantidade" min="1" value="<?= h($item['quantidade'] ?? 1) ?>" aria-label="Quantidade"><button class="text-button" type="submit">Salvar</button></form></td><td><?= h($item['subtotal'] ?? '') ?></td><td><form method="post" action="resource.php?r=pedidos" onsubmit="return confirm('Excluir este item do pedido?')"><input type="hidden" name="csrf_token" value="<?= h(csrf_token()) ?>"><input type="hidden" name="_action" value="item_delete"><input type="hidden" name="order_id" value="<?= h($orderId) ?>"><input type="hidden" name="item_id" value="<?= h($item['id_item'] ?? '') ?>"><button class="text-button" type="submit">Excluir</button></form></td></tr><?php endforeach; ?>
                    <?php if ($orderItems === []): ?><tr><td colspan="5">Este pedido ainda não tem itens.</td></tr><?php endif; ?>
                    </tbody></table></div>
                </section>
            <?php endif; ?>

            <?php if ($resourceKey === 'historico-precos'): ?>
                <section class="resource-card"><form class="inline-form" method="get" action="resource.php"><input type="hidden" name="r" value="historico-precos"><label>Filtrar por ID do produto<input type="number" name="produto" min="1" value="<?= h($_GET['produto'] ?? '') ?>"></label><button class="button button-primary" type="submit">Filtrar</button><a class="button button-secondary" href="resource.php?r=historico-precos">Limpar filtro</a></form></section>
            <?php endif; ?>

            <div class="table-wrap"><table class="data-table"><thead><tr><?php foreach ($definition['columns'] as $columnLabel): ?><th><?= h($columnLabel) ?></th><?php endforeach; ?><?php if (!($definition['readOnly'] ?? false) && !($definition['createOnly'] ?? false)): ?><th>Ações</th><?php elseif ($resourceKey === 'pedidos'): ?><th>Ações</th><?php endif; ?></tr></thead><tbody>
                <?php foreach ($records as $record): ?><tr>
                    <?php foreach ($definition['columns'] as $column => $columnLabel): ?><td><?= h(resource_value($record, $column)) ?></td><?php endforeach; ?>
                    <?php if (!($definition['readOnly'] ?? false) && !($definition['createOnly'] ?? false)): ?>
                        <?php $rowId = (string) ($record[$definition['id']] ?? ''); ?>
                        <td><div class="row-actions">
                            <?php if ($resourceKey !== 'pedidos'): ?><a href="resource.php?r=<?= h($resourceKey) ?>&amp;edit=<?= h($rowId) ?>">Editar</a><?php endif; ?>
                            <?php if ($resourceKey === 'pedidos'): ?><a href="resource.php?r=pedidos&amp;order_id=<?= h($rowId) ?>">Itens</a><?php endif; ?>
                            <?php if (!($definition['updateOnly'] ?? false) && $resourceKey !== 'pedidos'): ?><form method="post" action="resource.php?r=<?= h($resourceKey) ?>" onsubmit="return confirm('Confirma a exclusão ou desativação?')"><input type="hidden" name="csrf_token" value="<?= h(csrf_token()) ?>"><input type="hidden" name="_action" value="delete"><input type="hidden" name="record_id" value="<?= h($rowId) ?>"><button class="text-button" type="submit">Excluir</button></form><?php endif; ?>
                        </div></td>
                    <?php elseif ($resourceKey === 'pedidos'): ?><td><a href="resource.php?r=pedidos&amp;order_id=<?= h($record['id_pedido'] ?? '') ?>">Ver itens</a></td><?php endif; ?>
                </tr><?php endforeach; ?>
                <?php if ($records === []): ?><tr><td colspan="<?= count($definition['columns']) + 1 ?>">Nenhum registro encontrado ou a API está indisponível.</td></tr><?php endif; ?>
            </tbody></table></div>
        </section>
    </main>
</div>
</body>
</html>
