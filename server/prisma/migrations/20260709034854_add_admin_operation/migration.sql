-- CreateTable
CREATE TABLE "AdminOperation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "adminId" INTEGER NOT NULL,
    "targetUserId" INTEGER,
    "action" TEXT NOT NULL,
    "delta" INTEGER,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AdminOperation_targetUserId_idx" ON "AdminOperation"("targetUserId");

-- CreateIndex
CREATE INDEX "AdminOperation_adminId_idx" ON "AdminOperation"("adminId");
