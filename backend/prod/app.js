"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const fs_1 = __importDefault(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const multer_1 = __importDefault(require("multer"));
const prisma_1 = __importDefault(require("./prisma"));
const uuid_1 = require("uuid");
const strip_bom_stream_1 = __importDefault(require("strip-bom-stream"));
const app = (0, express_1.default)();
const port = process.env.PORT;
const upload = (0, multer_1.default)({ dest: "backend/uploads/" });
app.use(express_1.default.json());
async function popularDeputados(deputadosUnicos) {
    try {
        const deputadosArray = Array.from(deputadosUnicos.values());
        const batchSize = 100;
        for (let i = 0; i < deputadosArray.length; i += batchSize) {
            const batch = deputadosArray.slice(i, i + batchSize);
            await prisma_1.default.$transaction(async (prisma) => {
                await Promise.all(batch.map(async (value) => {
                    const exists = await prisma.deputado.findFirst({
                        where: {
                            OR: [
                                { deputadoId: value.id },
                                { cpf: value.cpf }
                            ]
                        }
                    });
                    if (!exists) {
                        await prisma.deputado.create({
                            data: {
                                deputadoId: value.id,
                                nome: value.nome,
                                cpf: value.cpf,
                                partido: value.partido,
                                uf: value.uf,
                                despesas: {
                                    create: value.despesas.map((despesa) => ({
                                        despesaId: despesa.despesaId,
                                        dataEmissao: despesa.dataEmissao,
                                        fornecedor: despesa.fornecedor,
                                        valorLiquido: parseFloat(despesa.valorLiquido),
                                        urlDocumento: despesa.urlDocumento,
                                    })),
                                },
                            },
                        });
                    }
                    else {
                        await prisma.despesa.createMany({
                            data: value.despesas.map((d) => ({
                                despesaId: d.despesaId,
                                dataEmissao: d.dataEmissao,
                                fornecedor: d.fornecedor,
                                valorLiquido: d.valorLiquido,
                                urlDocumento: d.urlDocumento,
                                deputadoId: exists.deputadoId,
                            })),
                        });
                    }
                }));
            }, { maxWait: 20000, timeout: 20000 });
        }
    }
    catch (error) {
        throw error;
    }
}
app.get("/deputados", (req, res) => {
    const { uf } = req.query;
    //pesquisa todos os deputados com a uf indicada
    //array uf de vários deputados
});
app.post("/upload-ceap", upload.single("ceapFile"), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo CSV enviado." });
        return;
    }
    else {
        const filePath = req.file.path;
        const deputadosUnicos = new Map();
        try {
            await new Promise((resolve, reject) => {
                fs_1.default.createReadStream(filePath)
                    .pipe((0, strip_bom_stream_1.default)())
                    .pipe((0, csv_parser_1.default)({
                    separator: ";",
                    mapHeaders: ({ header }) => header.trim(),
                    mapValues: ({ value }) => value.trim(),
                }))
                    .on("data", (data) => {
                    if (data.sgUF !== "NA") {
                        let uniqueKey = `Nome: ${data.txNomeParlamentar} | CPF: ${data.cpf}`;
                        if (!deputadosUnicos.has(uniqueKey)) {
                            deputadosUnicos.set(uniqueKey, {
                                id: (0, uuid_1.v4)(),
                                nome: data.txNomeParlamentar,
                                cpf: data.cpf,
                                partido: data.sgPartido,
                                uf: data.sgUF,
                                despesas: [],
                            });
                        }
                        deputadosUnicos.get(uniqueKey)?.despesas.push({
                            despesaId: (0, uuid_1.v4)(),
                            dataEmissao: data.datEmissao,
                            fornecedor: data.txtFornecedor,
                            valorLiquido: data.vlrLiquido,
                            urlDocumento: data.urlDocumento,
                        });
                    }
                })
                    .on("end", () => {
                    fs_1.default.unlinkSync(filePath);
                    try {
                        popularDeputados(deputadosUnicos);
                        res.status(200).json({ message: "Banco de dados populado" });
                    }
                    catch (error) {
                        res.status(400).json({ error: `Erro ao popular banco de dados` });
                    }
                    resolve();
                })
                    .on("error", (error) => {
                    reject(error);
                });
            });
        }
        catch (error) {
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
            res.status(500).json({ error: `Erro ao processar o CSV` });
        }
    }
});
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
