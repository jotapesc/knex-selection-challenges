-- CreateTable
CREATE TABLE "Deputado" (
    "deputadoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "partido" TEXT NOT NULL,
    "uf" TEXT NOT NULL,

    CONSTRAINT "Deputado_pkey" PRIMARY KEY ("deputadoId")
);

-- CreateTable
CREATE TABLE "Despesa" (
    "despesaId" TEXT NOT NULL,
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "valorLiquido" DECIMAL(65,30) NOT NULL,
    "urlDocumento" TEXT NOT NULL,

    CONSTRAINT "Despesa_pkey" PRIMARY KEY ("despesaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Deputado_deputadoId_key" ON "Deputado"("deputadoId");

-- CreateIndex
CREATE UNIQUE INDEX "Deputado_cpf_key" ON "Deputado"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Despesa_despesaId_key" ON "Despesa"("despesaId");

-- AddForeignKey
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_despesaId_fkey" FOREIGN KEY ("despesaId") REFERENCES "Deputado"("deputadoId") ON DELETE RESTRICT ON UPDATE CASCADE;
