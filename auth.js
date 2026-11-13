const jwt = require("jsonwebtoken");
const { runtimeConfig } = require("./config");

const issuer = "api-simples";
const audience = "api-simples-client";
const tokenLifetimeSeconds = 15 * 60;

function issueToken(user) {
    const { jwtSecret } = runtimeConfig();
    return jwt.sign(
        { role: user.role },
        jwtSecret,
        {
            algorithm: "HS256",
            subject: String(user.id_usu),
            issuer,
            audience,
            expiresIn: tokenLifetimeSeconds
        }
    );
}

function authenticate(req, res, next) {
    const authorization = req.get("authorization") || "";
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match) {
        return res.status(401).json({ erro: "Autenticação obrigatória." });
    }

    try {
        const { jwtSecret } = runtimeConfig();
        const payload = jwt.verify(match[1], jwtSecret, {
            algorithms: ["HS256"],
            issuer,
            audience
        });
        if (!payload.sub || !["admin", "operador"].includes(payload.role)) {
            return res.status(401).json({ erro: "Token inválido." });
        }
        req.auth = { id: payload.sub, role: payload.role };
        return next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ erro: "Token inválido ou expirado." });
        }
        return next(error);
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.auth || !roles.includes(req.auth.role)) {
            return res.status(403).json({ erro: "Acesso não autorizado para este perfil." });
        }
        return next();
    };
}

module.exports = { authenticate, issueToken, requireRole, tokenLifetimeSeconds };
