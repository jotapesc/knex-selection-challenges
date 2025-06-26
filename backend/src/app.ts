import express from "express";
import "dotenv/config";
import fs from "fs";
import csv from "csv-parser";
import multer from "multer";
import prisma from "./prisma";
import { v4 as uuidv4 } from "uuid";

const app = express();
const port = process.env.PORT;
const upload = multer({ dest: "backend/uploads/" });


app.use(express.json());

app.get("/deputados", (req, res) => {
  const { uf } = req.query;
  //pesquisa todos os deputados com a uf indicada
});

app.post("/upload-ceap", upload.single("ceapFile"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo CSV enviado." });
  } else {
    const results: any[] = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
      .pipe(csv({ separator: ';' }))
      .on("data", (data) => {
        if (data.sgUF !== "NA") {
          results.push(data);
        }
      })
      .on("end", () => {
        fs.unlinkSync(filePath);
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