const express = require("express");
const router = express.Router();
const { pool, query, transaction, fail, invalid, parseId } = require("./_helpers");

async function addItem(connection, idPedido, item) {
    const idProduto = Number(item.id_produto);
    const quantidade = Number(item.quantidade);
    if (!Number.isInteger(idProduto) || idProduto <= 0 ||
        !Number.isInteger(quantidade) || quantidade <= 0) {
        throw invalid("Cada item precisa de id_produto e quantidade inteira positiva.");
    }

    const products = await query(
        connection,
        "SELECT preco FROM produtos WHERE id_produto = ?",
        [idProduto]
    );
    if (products.length === 0) {
        const error = new Error(`Produto ${idProduto} não encontrado.`);
        error.status = 404;
        throw error;
    }
    if (products[0].preco === null) {
        throw invalid(`O produto ${idProduto} não possui preço cadastrado.`);
    }

    const price = Number(products[0].preco);
    return query(
        connection,
        `INSERT INTO pedido_itens (id_pedido, id_produto, quantidade, valor_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [idPedido, idProduto, quantidade, price, (price * quantidade).toFixed(2)]
    );
}

router.get("/", (req, res) => {
    pool.query(
        `SELECT p.*, c.nome AS cliente_nome
         FROM pedidos p
         LEFT JOIN clientes c ON c.id_cliente = p.id_cliente
         ORDER BY p.data_pedido DESC, p.id_pedido DESC`,
        (error, rows) => {
            if (error) return fail(res, error);
            return res.status(200).json({ pedidos: rows });
        }
    );
});

router.get("/:id/itens", (req, res) => {
    let id;
    try {
        id = parseId(req.params.id);
    } catch (error) {
        return fail(res, error);
    }

    pool.query("SELECT id_pedido FROM pedidos WHERE id_pedido = ?", [id], (lookupError, orders) => {
        if (lookupError) return fail(res, lookupError);
        if (orders.length === 0) return res.status(404).json({ erro: "Pedido não encontrado." });
        pool.query(
            `SELECT i.*, p.nome AS produto_nome
             FROM pedido_itens i
             LEFT JOIN produtos p ON p.id_produto = i.id_produto
             WHERE i.id_pedido = ?
             ORDER BY i.id_item`,
            [id],
            (error, rows) => {
                if (error) return fail(res, error);
                return res.status(200).json({ itens: rows });
            }
        );
    });
});

router.get("/:id", async (req, res) => {
    let id;
    try {
        id = parseId(req.params.id);
    } catch (error) {
        return fail(res, error);
    }

    try {
        const pedidos = await new Promise((resolve, reject) => {
            pool.query("SELECT * FROM pedidos WHERE id_pedido = ?", [id], (error, rows) => {
                if (error) return reject(error);
                resolve(rows);
            });
        });
        if (pedidos.length === 0) return res.status(404).json({ erro: "Pedido não encontrado." });

        const itens = await new Promise((resolve, reject) => {
            pool.query(
                `SELECT i.*, p.nome AS produto_nome
                 FROM pedido_itens i
                 LEFT JOIN produtos p ON p.id_produto = i.id_produto
                 WHERE i.id_pedido = ? ORDER BY i.id_item`,
                [id],
                (error, rows) => {
                    if (error) return reject(error);
                    resolve(rows);
                }
            );
        });
        return res.status(200).json({ pedido: pedidos[0], itens });
    } catch (error) {
        return fail(res, error);
    }
});

router.post("/", async (req, res) => {
    const body = req.body || {};
    if (!Array.isArray(body.itens) || body.itens.length === 0) {
        return fail(res, invalid("O pedido precisa conter ao menos um item."));
    }
    if (body.status !== undefined && ![0, 1, false, true].includes(body.status)) {
        return fail(res, invalid("O status deve ser 0 ou 1."));
    }

    try {
        const result = await transaction(async (connection) => {
            const idCliente = body.id_cliente === undefined || body.id_cliente === null
                ? null
                : Number(body.id_cliente);
            if (idCliente !== null && (!Number.isInteger(idCliente) || idCliente <= 0)) {
                throw invalid("id_cliente deve ser um inteiro positivo ou null.");
            }
            if (idCliente !== null) {
                const clients = await query(
                    connection,
                    "SELECT id_cliente FROM clientes WHERE id_cliente = ?",
                    [idCliente]
                );
                if (clients.length === 0) {
                    const error = new Error("Cliente não encontrado.");
                    error.status = 404;
                    throw error;
                }
            }

            const order = await query(
                connection,
                `INSERT INTO pedidos (status, data_pedido, id_cliente)
                 VALUES (?, COALESCE(?, CURDATE()), ?)`,
                [body.status ?? 1, body.data_pedido || null, idCliente]
            );
            for (const item of body.itens) {
                await addItem(connection, order.insertId, item);
            }
            return order;
        });
        return res.status(201).json({ mensagem: "Pedido criado com sucesso.", id_pedido: result.insertId });
    } catch (error) {
        return fail(res, error);
    }
});

router.post("/:id/itens", async (req, res) => {
    let id;
    try {
        id = parseId(req.params.id);
    } catch (error) {
        return fail(res, error);
    }

    try {
        const item = await transaction(async (connection) => {
            const orders = await query(connection, "SELECT id_pedido FROM pedidos WHERE id_pedido = ?", [id]);
            if (orders.length === 0) {
                const error = new Error("Pedido não encontrado.");
                error.status = 404;
                throw error;
            }
            return addItem(connection, id, req.body || {});
        });
        return res.status(201).json({ mensagem: "Item adicionado ao pedido.", id_item: item.insertId });
    } catch (error) {
        return fail(res, error);
    }
});

router.patch("/:id/itens/:idItem", async (req, res) => {
    let idPedido;
    let idItem;
    try {
        idPedido = parseId(req.params.id);
        idItem = parseId(req.params.idItem);
    } catch (error) {
        return fail(res, error);
    }

    const quantidade = Number((req.body || {}).quantidade);
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
        return fail(res, invalid("A quantidade deve ser um inteiro positivo."));
    }

    try {
        const updated = await transaction(async (connection) => {
            const items = await query(
                connection,
                "SELECT id_item, valor_unitario FROM pedido_itens WHERE id_item = ? AND id_pedido = ?",
                [idItem, idPedido]
            );
            if (items.length === 0) {
                const error = new Error("Item não encontrado neste pedido.");
                error.status = 404;
                throw error;
            }
            return query(
                connection,
                "UPDATE pedido_itens SET quantidade = ?, subtotal = ? WHERE id_item = ? AND id_pedido = ?",
                [
                    quantidade,
                    (Number(items[0].valor_unitario) * quantidade).toFixed(2),
                    idItem,
                    idPedido
                ]
            );
        });
        return res.status(200).json({ mensagem: "Item atualizado.", linhas_afetadas: updated.affectedRows });
    } catch (error) {
        return fail(res, error);
    }
});

router.delete("/:id/itens/:idItem", (req, res) => {
    let idPedido;
    let idItem;
    try {
        idPedido = parseId(req.params.id);
        idItem = parseId(req.params.idItem);
    } catch (error) {
        return fail(res, error);
    }

    pool.query(
        "DELETE FROM pedido_itens WHERE id_item = ? AND id_pedido = ?",
        [idItem, idPedido],
        (error, result) => {
            if (error) return fail(res, error);
            if (result.affectedRows === 0) {
                return res.status(404).json({ erro: "Item não encontrado neste pedido." });
            }
            return res.status(204).end();
        }
    );
});

router.patch("/:id", async (req, res) => {
    let id;
    try {
        id = parseId(req.params.id);
    } catch (error) {
        return fail(res, error);
    }

    const body = req.body || {};
    const fields = ["status", "data_pedido", "id_cliente"].filter((field) =>
        Object.hasOwn(body, field)
    );
    if (fields.length === 0) return fail(res, invalid("Informe status, data_pedido ou id_cliente."));
    if (Object.hasOwn(body, "status") && ![0, 1, false, true].includes(body.status)) {
        return fail(res, invalid("O status deve ser 0 ou 1."));
    }
    if (Object.hasOwn(body, "id_cliente") && body.id_cliente !== null) {
        const idCliente = Number(body.id_cliente);
        if (!Number.isInteger(idCliente) || idCliente <= 0) {
            return fail(res, invalid("id_cliente deve ser um inteiro positivo ou null."));
        }
        try {
            const clients = await new Promise((resolve, reject) => {
                pool.query(
                    "SELECT id_cliente FROM clientes WHERE id_cliente = ?",
                    [idCliente],
                    (error, rows) => {
                        if (error) return reject(error);
                        resolve(rows);
                    }
                );
            });
            if (clients.length === 0) return res.status(404).json({ erro: "Cliente não encontrado." });
            body.id_cliente = idCliente;
        } catch (error) {
            return fail(res, error);
        }
    }

    const assignments = fields.map((field) => `${field} = ?`).join(", ");
    const values = fields.map((field) => body[field]);
    values.push(id);
    pool.query(`UPDATE pedidos SET ${assignments} WHERE id_pedido = ?`, values, (error, result) => {
        if (error) return fail(res, error);
        if (result.affectedRows === 0) {
            return pool.query("SELECT id_pedido FROM pedidos WHERE id_pedido = ?", [id], (lookupError, rows) => {
                if (lookupError) return fail(res, lookupError);
                if (rows.length === 0) return res.status(404).json({ erro: "Pedido não encontrado." });
                return res.status(200).json({ mensagem: "Nenhuma alteração necessária." });
            });
        }
        return res.status(200).json({ mensagem: "Pedido atualizado." });
    });
});

module.exports = router;
