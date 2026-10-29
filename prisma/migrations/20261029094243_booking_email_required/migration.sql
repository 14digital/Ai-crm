/*
  Warnings:

  - Made the column `customerEmail` on table `Booking` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "customerEmail" SET NOT NULL;
