<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

if (isset($_SESSION['api_token'], $_SESSION['token_expires_at']) && (int) $_SESSION['token_expires_at'] > time()) {
    header('Location: dashboard.php');
    exit;
}

$error = '';
$emailForForm = is_string($_POST['email'] ?? null) ? $_POST['email'] : '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $emailInput = $_POST['email'] ?? '';
    $passwordInput = $_POST['senha'] ?? '';
    $email = is_string($emailInput) ? trim($emailInput) : '';
    $password = is_string($passwordInput) ? $passwordInput : '';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
        $error = 'Informe um email válido e sua senha.';
    } else {
        try {
            $result = api_request('/usuario/login', [
                'email' => $email,
                'senha' => $password,
            ]);
            if (
                !isset($result['access_token'], $result['usuario']) ||
                !is_string($result['access_token']) ||
                !is_array($result['usuario'])
            ) {
                throw new RuntimeException('A resposta de login da API está incompleta.');
            }

            session_regenerate_id(true);
            $_SESSION['api_token'] = $result['access_token'];
            $_SESSION['token_expires_at'] = time() + (int) ($result['expires_in'] ?? 900);
            $_SESSION['user'] = [
                'nome' => (string) ($result['usuario']['nome'] ?? ''),
                'email' => (string) ($result['usuario']['email'] ?? $email),
                'role' => (string) ($result['usuario']['role'] ?? 'operador'),
            ];
            header('Location: dashboard.php');
            exit;
        } catch (ApiException $exception) {
            $error = $exception->statusCode === 401
                ? 'Email ou senha inválidos.'
                : $exception->getMessage();
        } catch (RuntimeException $exception) {
            $error = $exception->getMessage();
        }
    }
}
?>
<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#f5f6f2">
    <title>Entrar · Vitrine</title>
    <link rel="stylesheet" href="style.css">
</head>
<body class="login-page">
<main class="login-layout">
    <section class="login-card">
        <a class="brand" href="index.php"><span class="brand-mark">V</span><span>vitrine<span class="brand-dot">.</span></span></a>
        <p class="eyebrow">GESTÃO DA LOJA</p>
        <h1>Bom ter você<br>por aqui.</h1>
        <p class="muted">Entre com a sua conta para acessar o painel.</p>
        <?php if ($error !== ''): ?>
            <div class="alert alert-error" role="alert"><?= h($error) ?></div>
        <?php endif; ?>
        <form class="stack-form" method="post" action="index.php">
            <input type="hidden" name="csrf_token" value="<?= h(csrf_token()) ?>">
            <label>Email
                <input name="email" type="email" autocomplete="username" placeholder="voce@empresa.com" required value="<?= h($emailForForm) ?>">
            </label>
            <label>Senha
                <input name="senha" type="password" autocomplete="current-password" placeholder="Sua senha" required>
            </label>
            <button class="button button-primary button-wide" type="submit">Entrar <span aria-hidden="true">→</span></button>
        </form>
        <p class="login-foot">Acesso protegido · API Simples</p>
    </section>
    <aside class="login-art" aria-label="Gestão da loja">
        <span class="art-tag">UM OLHAR MAIS CLARO</span>
        <h2>Sua loja,<br>em boas mãos.</h2>
        <p>Produtos, pedidos e estoque<br>em um só lugar.</p>
        <div class="art-note"><span class="note-icon">↗</span><span><b>Organização que inspira</b><small>Uma rotina mais leve começa aqui.</small></span></div>
    </aside>
</main>
</body>
</html>
