/*
  Warnings:

  - You are about to drop the column `latitude` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the column `photo_url` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the `graph_edges` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `graph_nodes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `routes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `zones` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `area` to the `schools` table without a default value. This is not possible if the table is not empty.
  - Added the required column `location` to the `schools` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `graph_edges` DROP FOREIGN KEY `graph_edges_sourceId_fkey`;

-- DropForeignKey
ALTER TABLE `graph_edges` DROP FOREIGN KEY `graph_edges_targetId_fkey`;

-- DropForeignKey
ALTER TABLE `zones` DROP FOREIGN KEY `zones_school_id_fkey`;

-- AlterTable
ALTER TABLE `schools` DROP COLUMN `latitude`,
    DROP COLUMN `longitude`,
    DROP COLUMN `photo_url`,
    ADD COLUMN `area` POLYGON NOT NULL,
    ADD COLUMN `location` POINT NOT NULL,
    MODIFY `address` TEXT NULL;

-- DropTable
DROP TABLE `graph_edges`;

-- DropTable
DROP TABLE `graph_nodes`;

-- DropTable
DROP TABLE `routes`;

-- DropTable
DROP TABLE `zones`;

-- CreateTable
CREATE TABLE `bus_stops` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `address` TEXT NULL,
    `description` TEXT NULL,
    `location` POINT NOT NULL,
    `area` POLYGON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bus_routes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(7) NOT NULL,
    `pathData` JSON NOT NULL,
    `schedule` JSON NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_BusRouteToBusStop` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_BusRouteToBusStop_AB_unique`(`A`, `B`),
    INDEX `_BusRouteToBusStop_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_BusRouteToBusStop` ADD CONSTRAINT `_BusRouteToBusStop_A_fkey` FOREIGN KEY (`A`) REFERENCES `bus_routes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_BusRouteToBusStop` ADD CONSTRAINT `_BusRouteToBusStop_B_fkey` FOREIGN KEY (`B`) REFERENCES `bus_stops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
