<?php
declare(strict_types=1);

$apiBaseUrl = rtrim((string) (getenv('API_BASE_URL') ?: 'https://api-simples.onrender.com'), '/');
$apiUrlParts = parse_url($apiBaseUrl);
if (
    $apiUrlParts === false ||
    !isset($apiUrlParts['scheme'], $apiUrlParts['host']) ||
    !in_array($apiUrlParts['scheme'], ['http', 'https'], true) ||
    isset($apiUrlParts['user']) ||
    isset($apiUrlParts['pass']) ||
    isset($apiUrlParts['query']) ||
    isset($apiUrlParts['fragment'])
) {
    throw new RuntimeException('API_BASE_URL deve ser uma URL HTTP(S) válida, sem credenciais ou parâmetros.');
}

ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Lax');

$isHttps = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== '' && $_SERVER['HTTPS'] !== 'off';
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

final class ApiException extends RuntimeException
{
    public function __construct(string $message, public readonly int $statusCode)
    {
        parent::__construct($message);
    }
}

function h(string|int|null $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function csrf_token(): string
{
    return (string) $_SESSION['csrf_token'];
}

function verify_csrf(): void
{
    $submitted = $_POST['csrf_token'] ?? '';
    if (!is_string($submitted) || !hash_equals(csrf_token(), $submitted)) {
        http_response_code(400);
        exit('Solicitação inválida. Atualize a página e tente novamente.');
    }
}

function api_request(
    string $path,
    ?array $payload = null,
    ?string $token = null,
    ?string $method = null
): array
{
    global $apiBaseUrl;

    $method ??= $payload === null ? 'GET' : 'POST';
    $headers = ['Accept: application/json'];
    $options = [
        'http' => [
            'method' => $method,
            'header' => '',
            'timeout' => 10,
            'ignore_errors' => true,
        ],
    ];

    if ($payload !== null) {
        $headers[] = 'Content-Type: application/json';
        $options['http']['content'] = json_encode($payload, JSON_THROW_ON_ERROR);
    }
    if ($token !== null) {
        $headers[] = 'Authorization: Bearer ' . $token;
    }
    $options['http']['header'] = implode("\r\n", $headers);

    $context = stream_context_create($options);
    $body = @file_get_contents($apiBaseUrl . $path, false, $context);
    if ($body === false) {
        throw new RuntimeException('Não foi possível conectar à API. Confira API_BASE_URL e a disponibilidade do serviço.');
    }

    $statusCode = 0;
    foreach ($http_response_header ?? [] as $header) {
        if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $header, $matches)) {
            $statusCode = (int) $matches[1];
        }
    }
    if ($statusCode === 204 || $body === '') {
        $data = [];
    } else {
        $data = json_decode($body, true);
    }
    if (!is_array($data)) {
        throw new RuntimeException('A API respondeu em um formato inesperado.');
    }
    if ($statusCode < 200 || $statusCode >= 300) {
        $message = $data['erro']['mensagem'] ?? $data['erro'] ?? $data['mensagem'] ?? 'A API recusou a solicitação.';
        if (is_array($message)) {
            $message = $message['mensagem'] ?? 'A API recusou a solicitação.';
        }
        throw new ApiException(is_string($message) ? $message : 'A API recusou a solicitação.', $statusCode);
    }

    return $data;
}

function require_login(): void
{
    if (
        !isset($_SESSION['api_token'], $_SESSION['token_expires_at'], $_SESSION['user']) ||
        (int) $_SESSION['token_expires_at'] <= time()
    ) {
        unset($_SESSION['api_token'], $_SESSION['token_expires_at'], $_SESSION['user']);
        header('Location: index.php');
        exit;
    }
}

function money(mixed $value): string
{
    return $value === null ? '—' : 'R$ ' . number_format((float) $value, 2, ',', '.');
}
