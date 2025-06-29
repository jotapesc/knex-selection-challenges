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

// interface Despesa{
//   despesaId: string;
//   dataEmissao: string;
//   fornecedor: string;
//   valorLiquido: number;
//   urlDocumento: string;
// }

// async function despesaExists(despesas: Despesa[]) {
//   try {despesas.forEach(async (obj) => {
//     if (
//       await prisma.despesa.findFirst({
//         where: {
//           AND: [
//             { fornecedor: obj.fornecedor },
//             { valorLiquido: obj.valorLiquido },
//           ],
//         },
//       })
//     ) {
//       return console.log(`Fornecedor: ${obj.fornecedor} Valor: ${obj.valorLiquido}`);
//     }
//   });
// } catch(error){

// }
// }

async function popularDeputados(deputadosUnicos: Map<string, Deputado>) {
  try {
    const deputadosArray = Array.from(deputadosUnicos.values());

    const batchSize = 100;
    for (let i = 0; i < deputadosArray.length; i += batchSize) {
      const batch = deputadosArray.slice(i, i + batchSize);

      await prisma.$transaction(async (prisma) => {
        await Promise.all(
          batch.map(async (value) => {
            const deputadoExists = await prisma.deputado.findFirst({
              where: {
                OR: [
                  { deputadoId: value.id },
                  { cpf: value.cpf }
                ]
              }
            });

            // const todasDespesas = batch.flatMap((deputado) =>
            //   deputado.despesas.map(
            //     (despesa: { fornecedor: any; valorLiquido: string }) => ({
            //       fornecedor: despesa.fornecedor,
            //       valorLiquido: parseFloat(despesa.valorLiquido),
            //     })
            //   )
            // );

            // para cada elemento do array despesas, acesse a key fornecedor e compare se já existe no banco de dados
            // const despesaExists = await prisma.despesa.findFirst({
            //   where: {
            //     OR: [
            //       { fornecedor: value.despesas },
            //       { valorLiquido: value.despesas }
            //     ]
            //   }
            // });

            
            
            // despesaExists(value.despesas);

            // console.log(`${value.nome} ${value.despesas[5].fornecedor}`);

            if (!deputadoExists) {
              await prisma.deputado.create({
                data: {
                  deputadoId: value.id,
                  nome: value.nome,
                  cpf: value.cpf,
                  partido: value.partido,
                  uf: value.uf,
                  despesas: {
                    create: value.despesas.map(
                      (despesa: {
                        despesaId: any;
                        dataEmissao: string;
                        fornecedor: any;
                        valorLiquido: string;
                        urlDocumento: any;
                      }) => ({
                        despesaId: despesa.despesaId,
                        dataEmissao: despesa.dataEmissao,
                        fornecedor: despesa.fornecedor,
                        valorLiquido: parseFloat(despesa.valorLiquido),
                        urlDocumento: despesa.urlDocumento,
                      })
                    ),
                  },
                },
              });
            } else {
              await prisma.despesa.createMany({
                data: value.despesas.map(
                  (d: {
                    despesaId: any;
                    dataEmissao: any;
                    fornecedor: any;
                    valorLiquido: any;
                    urlDocumento: any;
                  }) => ({
                    despesaId: d.despesaId,
                    dataEmissao: d.dataEmissao,
                    fornecedor: d.fornecedor,
                    valorLiquido: d.valorLiquido,
                    urlDocumento: d.urlDocumento,
                    deputadoId: deputadoExists.deputadoId,
                  })
                ),
              });
            }
          })
        );
      }, {maxWait: 60000, timeout: 60000});     
    }
  } catch (error) {
    throw error;
  }
}

app.get("/deputados-por-uf", async (req, res) => {
  if (typeof req.query.depUF === "string") {
    const depUF: string = req.query.depUF.toUpperCase();
    try {
      const deputados = await prisma.deputado.findMany({
        where: {
          uf: depUF,
        },
      });
      if (deputados[0] === undefined) {
        res.status(400).json({ error: `UF inválida` });
      } else {
        res.status(200).json(deputados);
      }
      
    } catch (error) {
      res.status(400).json({ error: `Erro ao buscar deputados` });
    }
  }
});

app.get("/relatorios/deputados/:id/total-despesas", async (req, res) => {
  if (typeof req.params.id === "string") {
    const depID: string = req.params.id;
    try {
      const deputados = await prisma.deputado.findUnique({
        where: {
          deputadoId: depID,
        },
        include: {
          despesas: true,
        },
      });

      const soma = await prisma.despesa.aggregate({
        where: {deputadoId: deputados?.deputadoId},
        _sum: { valorLiquido: true },
      });

      if (deputados === null) {
        res.status(400).json({ error: `ID inválido` });
      } else {
        res.status(200).json(`Deputado(a): ${deputados.nome} tem uma despesa total de: ${soma._sum.valorLiquido}R$`);
      }
    } catch (error) {
      res.status(400).json({ error: `Erro ao buscar deputados` });
    }
  }
});

app.get("/relatorios/total-despesas", async (req, res) => {
  try {
    const soma = await prisma.despesa.aggregate({
      _sum: { valorLiquido: true },
    });
    res.status(200).json({ message: `Despesa total: ${soma._sum.valorLiquido}` });
  } catch (error) {
    res.status(400).json({ error: `Erro ao somar as dívidas` });
  }
});

app.get("/deputados/:id/despesas", async (req, res) => {
  if (
    typeof req.params.id === "string" &&
    typeof req.query.data === "string" &&
    typeof req.query.fornecedor === "string"
  ) {
    const depID: string = req.params.id;
    const despData: string = req.query.data;
    const despFornecedor: string = req.query.fornecedor;

    if (despData !== "" && despFornecedor !== "") {
      try {
        const deputados = await prisma.deputado.findUnique({
          where: {
            deputadoId: depID,
          },
          include: {
            despesas: {
              where: {
                AND: [
                  { dataEmissao: despData },
                  { fornecedor: despFornecedor },
                ],
              },
            },
          },
        });

        if (deputados === null) {
          res.status(400).json({ error: `ID inválido` });
        } else {
          res.status(200).json(deputados);
        }
      } catch (error) {
        res.status(400).json({ error: `Erro ao buscar deputados` });
      }
    } else if (despData !== "" || despFornecedor !== "") {
      try {
        const deputados = await prisma.deputado.findUnique({
          where: {
            deputadoId: depID,
          },
          include: {
            despesas: {
              where: {
                OR: [{ dataEmissao: despData }, { fornecedor: despFornecedor }],
              },
            },
          },
        });

        if (deputados === null) {
          res.status(400).json({ error: `ID inválido` });
        } else {
          res.status(200).json(deputados);
        }
      } catch (error) {
        res.status(400).json({ error: `Erro ao buscar deputados` });
      }
    } else {
      try {
        const deputados = await prisma.deputado.findUnique({
          where: {
            deputadoId: depID,
          },
          include: {
            despesas: true,
          },
        });

        if (deputados === null) {
          res.status(400).json({ error: `ID inválido` });
        } else {
          res.status(200).json(deputados);
        }
      } catch (error) {
        res.status(400).json({ error: `Erro ao buscar deputados` });
      }
    }
  }
});

app.get("/despesas", async (req, res) => {
  if (
    typeof req.query.data === "string" &&
    typeof req.query.fornecedor === "string"
  ) {
    const despData: string = req.query.data;
    const despFornecedor: string = req.query.fornecedor;

    if (despData !== "" && despFornecedor !== "") {
      try {
        const despesas = await prisma.despesa.findMany({
          where: {
            AND: [
                  { dataEmissao: despData },
                  { fornecedor: despFornecedor },
                ],
          },
        });

        if (despesas[0] === undefined) {
          res.status(400).json({ error: `Parâmetros inválidos` });
        } else {
          res.status(200).json(despesas);
        }
      } catch (error) {
        res.status(400).json({ error: `Erro ao buscar deputados` });
      }
    } else if (despData !== "" || despFornecedor !== "") {
      try {
        const despesas = await prisma.despesa.findMany({
          where: {
            OR: [
                  { dataEmissao: despData },
                  { fornecedor: despFornecedor },
                ],
          },
        });

        if (despesas[0] === undefined) {
          res.status(400).json({ error: `Parâmetros inválidos` });
        } else {
          res.status(200).json(despesas);
        }
      } catch (error) {
        res.status(400).json({ error: `Erro ao buscar deputados` });
      }
    } else {
      try {
        const despesas = await prisma.despesa.findMany();

        if (despesas[0] === undefined) {
          res.status(400).json({ error: `ID inválido` });
        } else {
          res.status(200).json(despesas);
        }
      } catch (error) {
        res.status(400).json({ error: `Erro ao buscar deputados` });
      }
    }
  }
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
              deputadosUnicos.get(uniqueKey)?.despesas.push(
                    {
                      despesaId: uuidv4(),
                      dataEmissao: data.datEmissao,
                      fornecedor: data.txtFornecedor,
                      valorLiquido: data.vlrLiquido,
                      urlDocumento: data.urlDocumento,
                    }
                  )
            }
          })
          .on("end", () => {
            fs.unlinkSync(filePath);
            try {
              popularDeputados(deputadosUnicos);
              res.status(200).json({ message: "Banco de dados populado" });
            } catch (error) {
              res.status(400).json({ error: `Erro ao popular banco de dados` });
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
