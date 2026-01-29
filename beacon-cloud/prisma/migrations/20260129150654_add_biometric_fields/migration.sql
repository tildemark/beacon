/*
  Warnings:

  - A unique constraint covering the columns `[biometricId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "biometricId" INTEGER,
ADD COLUMN     "enrolledAt" TIMESTAMP(3),
ADD COLUMN     "enrolledById" TEXT,
ADD COLUMN     "fingerprintEnrolled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fingerprintTemplate" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_biometricId_key" ON "User"("biometricId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_enrolledById_fkey" FOREIGN KEY ("enrolledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
