-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Work" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ppt',
    "style" TEXT NOT NULL DEFAULT 'business',
    "mode" TEXT NOT NULL DEFAULT 'fast',
    "category" TEXT NOT NULL DEFAULT 'business',
    "language" TEXT NOT NULL DEFAULT 'zh',
    "detailLevel" TEXT NOT NULL DEFAULT 'standard',
    "aspectRatio" TEXT NOT NULL DEFAULT '16:9',
    "pageCount" INTEGER NOT NULL DEFAULT 9,
    "taskId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "previewUrl" TEXT,
    "pdfUrl" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Work_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Work" ("aspectRatio", "category", "createdAt", "detailLevel", "error", "id", "language", "mode", "pageCount", "pdfUrl", "previewUrl", "progress", "prompt", "status", "style", "taskId", "title", "updatedAt", "userId") SELECT "aspectRatio", "category", "createdAt", "detailLevel", "error", "id", "language", "mode", "pageCount", "pdfUrl", "previewUrl", "progress", "prompt", "status", "style", "taskId", "title", "updatedAt", "userId" FROM "Work";
DROP TABLE "Work";
ALTER TABLE "new_Work" RENAME TO "Work";
CREATE INDEX "Work_userId_idx" ON "Work"("userId");
CREATE INDEX "Work_status_idx" ON "Work"("status");
CREATE INDEX "Work_type_idx" ON "Work"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
