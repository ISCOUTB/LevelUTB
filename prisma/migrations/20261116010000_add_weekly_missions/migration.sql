-- CreateEnum
CREATE TYPE "MissionCadence" AS ENUM ('ONCE', 'WEEKLY');

-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "code" TEXT,
ADD COLUMN     "cadence" "MissionCadence" NOT NULL DEFAULT 'ONCE';

-- AlterTable
ALTER TABLE "student_missions" ADD COLUMN     "weekKey" TEXT NOT NULL DEFAULT '';

-- DropIndex
DROP INDEX "student_missions_studentId_missionId_key";

-- CreateIndex
CREATE UNIQUE INDEX "missions_code_key" ON "missions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "student_missions_studentId_missionId_weekKey_key" ON "student_missions"("studentId", "missionId", "weekKey");
