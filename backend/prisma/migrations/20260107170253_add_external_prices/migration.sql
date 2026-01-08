-- CreateTable
CREATE TABLE "ExternalPrice" (
    "id" SERIAL NOT NULL,
    "clinicName" TEXT NOT NULL,
    "analysisName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "url" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalPrice_clinicName_analysisName_key" ON "ExternalPrice"("clinicName", "analysisName");
