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
const uuid_1 = require("uuid");
const strip_bom_stream_1 = __importDefault(require("strip-bom-stream"));
const app = (0, express_1.default)();
const port = process.env.PORT;
const upload = (0, multer_1.default)({ dest: "backend/uploads/" });
app.use(express_1.default.json());
app.get("/deputados", (req, res) => {
    const { uf } = req.query;
    //pesquisa todos os deputados com a uf indicada
});
app.post("/upload-ceap", upload.single("ceapFile"), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo CSV enviado." });
    }
    else {
        const filePath = req.file.path;
        const deputadosUnicos = new Map();
        const despesasUnicas = new Map();
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
                            });
                        }
                    }
                })
                    .on("end", () => {
                    fs_1.default.unlinkSync(filePath);
                    res.status(200).json({ message: "Sucesso" });
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
