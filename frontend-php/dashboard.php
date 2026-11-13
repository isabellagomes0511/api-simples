<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';
require_login();

$token = (string) $_SESSION['api_token'];
$user = $_SESSION['user'];
$stats = [
    'produtos' => null,
    'clientes' => null,
    'pedidos' => null,
    'estoque' => null,
];
$warning = '';

try {
    $products = api_request('/produtos', null, $token);
    $stats['produtos'] = count($products['produtos'] ?? []);

    $clients = api_request('/clientes', null, $token);
    $stats['clientes'] = count($clients['clientes'] ?? []);

    $orders = api_request('/pedidos', null, $token);
    $stats['pedidos'] = count($orders['pedidos'] ?? []);

    $stock = api_request('/estoque', null, $token);
    $stats['estoque'] = array_sum(array_map(
        static fn (array $item): int => (int) ($item['quantidade'] ?? 0),
        $stock['estoque'] ?? []
    ));
} catch (ApiException $exception) {
    if ($exception->statusCode === 401) {
        unset($_SESSION['api_token'], $_SESSION['token_expires_at'], $_SESSION['user']);
        header('Location: index.php');
        exit;
    }
    $warning = 'Não foi possível carregar todos os dados: ' . $exception->getMessage();
} catch (RuntimeException $exception) {
    $warning = $exception->getMessage();
}

$cards = [
    ['label' => 'Produtos cadastrados', 'value' => $stats['produtos'], 'icon' => '▧', 'caption' => 'Itens no catálogo'],
    ['label' => 'Clientes', 'value' => $stats['clientes'], 'icon' => '♙', 'caption' => 'Contatos registrados'],
    ['label' => 'Pedidos', 'value' => $stats['pedidos'], 'icon' => '▣', 'caption' => 'Pedidos registrados'],
    ['label' => 'Itens em estoque', 'value' => $stats['estoque'], 'icon' => '▤', 'caption' => 'Unidades disponíveis'],
];
?>
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f5f6f2">
    <title>Dashboard · Vitrine</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="dashboard-layout">
    <aside class="sidebar">
        <a class="brand" href="dashboard.php"><span class="brand-mark">V</span><span>vitrine<span class="brand-dot">.</span></span></a>
        <p class="side-label">MENU PRINCIPAL</p>
        <nav class="navigation" aria-label="Menu principal">
            <a class="nav-item active" href="dashboard.php"><span class="nav-icon">⌂</span>Dashboard</a>
            <a class="nav-item" href="resource.php?r=produtos"><span class="nav-icon">▧</span>Produtos</a>
            <a class="nav-item" href="resource.php?r=clientes"><span class="nav-icon">♙</span>Clientes</a>
            <a class="nav-item" href="resource.php?r=pedidos"><span class="nav-icon">▣</span>Pedidos</a>
            <a class="nav-item" href="resource.php?r=estoque"><span class="nav-icon">▤</span>Estoque</a>
            <a class="nav-item" href="resource.php?r=entradas"><span class="nav-icon">↓</span>Entradas</a>
            <a class="nav-item" href="resource.php?r=saidas"><span class="nav-icon">↑</span>Saídas</a>
            <a class="nav-item" href="resource.php?r=categorias"><span class="nav-icon">◇</span>Categorias</a>
            <a class="nav-item" href="resource.php?r=fornecedores"><span class="nav-icon">⌂</span>Fornecedores</a>
            <?php if ($user['role'] === 'admin'): ?>
                <a class="nav-item" href="resource.php?r=funcionarios"><span class="nav-icon">♧</span>Funcionários</a>
                <a class="nav-item" href="resource.php?r=usuarios"><span class="nav-icon">♙</span>Usuários</a>
            <?php endif; ?>
            <a class="nav-item" href="resource.php?r=historico-precos"><span class="nav-icon">◷</span>Histórico de preços</a>
        </nav>
        <div class="sidebar-bottom">
            <div class="avatar"><?= h(preg_match('/^./u', $user['nome'] ?: 'V', $initial) ? $initial[0] : 'V') ?></div>
            <div class="user-summary"><strong><?= h($user['nome'] ?: $user['email']) ?></strong><small><?= h($user['role'] === 'admin' ? 'Administrador' : 'Operador') ?></small></div>
            <form method="post" action="logout.php">
                <input type="hidden" name="csrf_token" value="<?= h(csrf_token()) ?>">
                <button class="icon-button" type="submit" aria-label="Sair" title="Sair">↪</button>
            </form>
        </div>
    </aside>

    <main class="main-area">
        <header class="topbar">
            <div class="breadcrumb"><span>Vitrine</span><span class="breadcrumb-sep">/</span><strong>Dashboard</strong></div>
            <div class="topbar-right"><span class="status-dot"></span><span>Área restrita</span></div>
        </header>
        <section class="page-content">
            <div class="page-heading">
                <div><p class="eyebrow">PAINEL DA LOJA</p><h1>Dashboard</h1><p>Olá, <?= h($user['nome'] ?: $user['email']) ?>. Aqui está o resumo da sua loja.</p></div>
                <span class="date-label"><?= h(date('d/m/Y')) ?></span>
            </div>
            <?php if ($warning !== ''): ?>
                <div class="alert alert-warning" role="status"><?= h($warning) ?></div>
            <?php endif; ?>
            <div class="stats-grid">
                <?php foreach ($cards as $card): ?>
                    <article class="stat-card">
                        <div class="stat-top"><span><?= h($card['label']) ?></span><span class="stat-icon"><?= h($card['icon']) ?></span></div>
                        <div class="stat-value"><?= $card['value'] === null ? '—' : number_format((int) $card['value'], 0, ',', '.') ?></div>
                        <div class="stat-caption"><?= h($card['caption']) ?></div>
                    </article>
                <?php endforeach; ?>
            </div>
            <section class="welcome-panel">
                <span class="welcome-icon">✦</span>
                <div><h2>Bem-vindo ao seu painel</h2><p>Esta área é privada. As informações são carregadas da API após a autenticação.</p></div>
            </section>
        </section>
    </main>
</div>
</body>
</html>
