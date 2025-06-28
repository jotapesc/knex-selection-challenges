import express from "express";
import "dotenv/config";
import fs from "fs";
import csv from "csv-parser";
import multer from "multer";
import prisma from "./prisma";
import { v4 as uuidv4 } from "uuid";
import stripBomStream from "strip-bom-stream";

const app = express();
const port = process.env.PORT;
const upload = multer({ dest: "backend/uploads/" });

app.use(express.json());

interface Deputado {
  id: string;
  nome: string;
  cpf: string;
  partido: string;
  uf: string;
  despesas: any;
}

async function popularDeputados(deputadosUnicos: Map<string, Deputado>) {
  try {
    const deputadosArray = Array.from(deputadosUnicos.values());

    const batchSize = 100;
    for (let i = 0; i < deputadosArray.length; i += batchSize) {
      const batch = deputadosArray.slice(i, i + batchSize);

      await prisma.$transaction(async (prisma) => {
        await Promise.all(
          batch.map(async (value) => {
            const exists = await prisma.deputado.findFirst({
              where: {
                OR: [
                  { deputadoId: value.id },
                  { cpf: value.cpf }
                ]
              }
            });
          })
        );
      });     
    }
  } catch (error) {
    throw error;
  }
}

app.get("/deputados", (req, res) => {
  const { uf } = req.query;
  //pesquisa todos os deputados com a uf indicada
});

app.post("/upload-ceap", upload.single("ceapFile"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Nenhum arquivo CSV enviado." });
    return;
  } else {
    const filePath = req.file.path;
    const deputadosUnicos = new Map<string, Deputado>();

    try {
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(stripBomStream())
          .pipe(
            csv({
              separator: ";",
              mapHeaders: ({ header }) => header.trim(),
              mapValues: ({ value }) => value.trim(),
            })
          )
          .on("data", (data) => {
            if (data.sgUF !== "NA") {
              let uniqueKey = `Nome: ${data.txNomeParlamentar} | CPF: ${data.cpf}`;
              if (!deputadosUnicos.has(uniqueKey)) {
                deputadosUnicos.set(uniqueKey, {
                  id: uuidv4(),
                  nome: data.txNomeParlamentar,
                  cpf: data.cpf,
                  partido: data.sgPartido,
                  uf: data.sgUF,
                  despesas: [],
                });
              }
              deputadosUnicos.get(uniqueKey)?.despesas.push({
                despesaId: uuidv4(),
                dataEmissao: data.datEmissao,
                fornecedor: data.txtFornecedor,
                valorLiquido: data.vlrLiquido,
                urlDocumento: data.urlDocumento,
              });
            }
          })
          .on("end", () => {
            fs.unlinkSync(filePath);
            try {
              popularDeputados(deputadosUnicos);
              res.status(200).json({ message: "Sucesso" });
            } catch (error) {
              res.status(400).json({ error: `Erro ao criar deputados` });
            }
            resolve();
          })
          .on("error", (error) => {
            reject(error);
          });
      });
    } catch (error) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      res.status(500).json({ error: `Erro ao processar o CSV` });
    }
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
