/*
  Warnings:

  - A unique constraint covering the columns `[countryCode,phoneNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `countryCode` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "User_phoneNumber_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "countryCode" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_countryCode_phoneNumber_key" ON "User"("countryCode", "phoneNumber");
