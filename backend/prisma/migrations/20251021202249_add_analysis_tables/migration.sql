-- CreateTable
CREATE TABLE "AnalysisType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "refMin" DOUBLE PRECISION,
    "refMax" DOUBLE PRECISION,
    "interpretationLow" TEXT,
    "interpretationNormal" TEXT,
    "interpretationHigh" TEXT,

    CONSTRAINT "AnalysisType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisResult" (
    "id" SERIAL NOT NULL,
    "value" DOUBLE PRECISION,
    "stringValue" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "analysisTypeId" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "AnalysisResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisType_name_key" ON "AnalysisType"("name");

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_analysisTypeId_fkey" FOREIGN KEY ("analysisTypeId") REFERENCES "AnalysisType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
