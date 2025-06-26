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
const app = (0, express_1.default)();
const port = process.env.PORT;
const upload = (0, multer_1.default)({ dest: "backend/uploads/" });
app.use(express_1.default.json());
app.get("/deputados", (req, res) => {
    const { uf } = req.query;
    //pesquisa todos os deputados com a uf indicada
});
app.post("/upload-ceap", upload.single("ceapFile"), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo CSV enviado." });
    }
    else {
        const results = [];
        const filePath = req.file.path;
        fs_1.default.createReadStream(filePath)
            .pipe((0, csv_parser_1.default)({ separator: ';' }))
            .on("data", (data) => {
            if (data.sgUF !== "NA") {
                results.push(data);
            }
        })
            .on("end", () => {
            fs_1.default.unlinkSync(filePath);
            res.json({ data: results });
        })
            .on("error", (error) => {
            res.status(500).json({ error: `Erro ao processar o CSV: ${error.message}` });
        });
    }
});
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
