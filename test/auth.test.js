process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "unit-test-secret-with-at-least-32-bytes";
process.env.DB_HOST = "127.0.0.1";
process.env.DB_PORT = "3306";
process.env.DB_USER = "test";
process.env.DB_PASSWORD = "";
process.env.DB_NAME = "test";
process.env.CORS_ORIGINS = "http://localhost:3000";
delete process.env.TRUST_PROXY;

const bcrypt = require("bcryptjs");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const request = require("supertest");
const app = require("../app");
const { pool } = require("../mysql");
const { issueToken } = require("../auth");
const { runtimeConfig } = require("../config");

test("production configuration permits API-only deployment without CORS origins", (t) => {
    const previousEnv = {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: process.env.JWT_SECRET,
        CORS_ORIGINS: process.env.CORS_ORIGINS
    };
    t.after(() => {
        for (const [key, value] of Object.entries(previousEnv)) {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        }
    });

    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "production-test-secret-with-at-least-32-bytes";
    delete process.env.CORS_ORIGINS;

    const config = runtimeConfig();
    assert.deepEqual(config.corsOrigins, []);
});

function token(id, role) {
    return issueToken({ id_usu: id, role });
}

test("PHP frontend is hosted separately from the API", async () => {
    await request(app)
        .get("/")
        .expect(404);
});

function stubQuery(t, handler) {
    const originalQuery = pool.query;
    pool.query = (sql, values, callback) => {
        if (typeof values === "function") {
            callback = values;
            values = [];
        }
        return handler(sql, values, callback);
    };
    t.after(() => {
        pool.query = originalQuery;
    });
}

test("liveness endpoint is public", async () => {
    await request(app)
        .get("/health/live")
        .expect(200, { status: "ok" });
});

test("readiness endpoint checks the database", async (t) => {
    stubQuery(t, (sql, values, callback) => callback(null, [{ ready: 1 }]));

    await request(app)
        .get("/health/ready")
        .expect(200, { status: "ok" });
});

test("readiness endpoint returns unavailable when the database is down", async (t) => {
    const originalConsoleError = console.error;
    console.error = () => {};
    t.after(() => {
        console.error = originalConsoleError;
    });
    stubQuery(t, (sql, values, callback) => callback(new Error("database unavailable")));

    await request(app)
        .get("/health/ready")
        .expect(503, { status: "indisponivel" });
});

test("API resources reject requests without a token", async () => {
    await request(app)
        .get("/clientes")
        .expect(401);
});

test("user registration is not public", async () => {
    await request(app)
        .post("/usuario")
        .send({ nome: "Teste", email: "teste@example.com", senha: "SenhaForte12345" })
        .expect(401);
});

test("operator cannot access employee and salary data", async () => {
    await request(app)
        .get("/funcionario")
        .set("Authorization", `Bearer ${token(2, "operador")}`)
        .expect(403);
});

test("operator can access store resources", async (t) => {
    stubQuery(t, (sql, values, callback) => callback(null, []));

    await request(app)
        .get("/clientes")
        .set("Authorization", `Bearer ${token(2, "operador")}`)
        .expect(200, { clientes: [] });
});

test("administrator can access user management", async (t) => {
    stubQuery(t, (sql, values, callback) => callback(null, []));

    await request(app)
        .get("/usuario")
        .set("Authorization", `Bearer ${token(1, "admin")}`)
        .expect(200, { usuarios: [] });
});

test("administrator can access employee records", async (t) => {
    stubQuery(t, (sql, values, callback) => callback(null, []));

    await request(app)
        .get("/funcionario")
        .set("Authorization", `Bearer ${token(1, "admin")}`)
        .expect(200, { funcionarios: [] });
});

test("administrator cannot deactivate its own account", async (t) => {
    const originalConsoleError = console.error;
    console.error = () => {};
    t.after(() => {
        console.error = originalConsoleError;
    });

    await request(app)
        .patch("/usuario/1")
        .set("Authorization", `Bearer ${token(1, "admin")}`)
        .send({ ativo: 0 })
        .expect(400, { erro: "Não é permitido desativar a própria conta." });
});

test("legacy plaintext passwords can no longer authenticate", async (t) => {
    stubQuery(t, (sql, values, callback) => callback(null, [{
        id_usu: 3,
        nome: "Usuário legado",
        email: "legado@example.com",
        senha_hash: "legacy-password",
        role: "operador",
        ativo: 1
    }]));

    await request(app)
        .post("/usuario/login")
        .send({ email: "legado@example.com", senha: "legacy-password" })
        .expect(401, { erro: "Email ou senha inválidos." });
});

test("login issues a short-lived bearer token for bcrypt passwords", async (t) => {
    const passwordHash = await bcrypt.hash("SenhaDeTesteSegura123", 4);
    stubQuery(t, (sql, values, callback) => callback(null, [{
        id_usu: 4,
        nome: "Operador",
        email: "operador@example.com",
        senha_hash: passwordHash,
        role: "operador",
        ativo: 1
    }]));

    const response = await request(app)
        .post("/usuario/login")
        .send({ email: "operador@example.com", senha: "SenhaDeTesteSegura123" })
        .expect(200);

    if (!response.body.access_token || response.body.token_type !== "Bearer" ||
        response.body.expires_in !== 900 || response.body.usuario.role !== "operador") {
        throw new Error("A resposta de login não contém o token esperado.");
    }
});
