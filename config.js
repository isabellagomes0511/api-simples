const fs = require("node:fs");

function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`A variável de ambiente ${name} é obrigatória.`);
    }
    return value;
}

function databaseConfig() {
    const port = Number(process.env.DB_PORT || 3306);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("DB_PORT deve ser um inteiro entre 1 e 65535.");
    }
    const password = process.env.DB_PASSWORD || "";
    if (process.env.NODE_ENV === "production" && !password) {
        throw new Error("DB_PASSWORD é obrigatória em produção.");
    }

    const config = {
        host: required("DB_HOST"),
        port,
        user: required("DB_USER"),
        password,
        database: required("DB_NAME")
    };
    if (process.env.DB_SSL_CA) {
        config.ssl = {
            ca: fs.readFileSync(process.env.DB_SSL_CA, "utf8"),
            rejectUnauthorized: true
        };
    }
    return config;
}

function runtimeConfig() {
    const port = Number(process.env.PORT || 5000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PORT deve ser um inteiro entre 1 e 65535.");
    }

    const jwtSecret = required("JWT_SECRET");
    if (Buffer.byteLength(jwtSecret, "utf8") < 32) {
        throw new Error("JWT_SECRET deve conter pelo menos 32 bytes.");
    }

    const production = process.env.NODE_ENV === "production";
    const corsOrigins = (process.env.CORS_ORIGINS || (production ? "" : "http://localhost:3000"))
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);

    const trustProxy = process.env.TRUST_PROXY;
    if (trustProxy && !/^[1-9]\d*$/.test(trustProxy)) {
        throw new Error("TRUST_PROXY deve ser um número inteiro positivo de proxies confiáveis.");
    }

    return {
        port,
        jwtSecret,
        corsOrigins,
        trustProxy: trustProxy ? Number(trustProxy) : false,
        production,
        test: process.env.NODE_ENV === "test"
    };
}

module.exports = { databaseConfig, runtimeConfig };
