-- CreateTable
CREATE TABLE "DashboardNote" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DashboardNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashboardNote_updatedAt_idx" ON "DashboardNote"("updatedAt");
