import type { Mission, MissionWithStudentStatus, MissionsStats, StudentMission, VerificationResult, VerificationProfile } from "../types"

export interface MissionRepository {
  findAvailableForStudent(studentId: string, studentLevel: number): Promise<Mission[]>
  findById(missionId: string): Promise<Mission | null>
  findByIdWithCourse(missionId: string): Promise<Mission | null>
}

export interface StudentMissionRepository {
  findByStudentId(studentId: string): Promise<StudentMission[]>
  findByStudentIdAndMissionId(studentId: string, missionId: string, weekKey?: string): Promise<StudentMission | null>
  create(data: { studentId: string; missionId: string; status: string; progress: number; weekKey?: string }): Promise<StudentMission>
  update(id: string, data: Partial<StudentMission>): Promise<StudentMission>
}

export interface MissionServiceRepository {
  getMissionsWithStudentStatus(studentId: string, studentLevel: number): Promise<{
    missions: MissionWithStudentStatus[]
    stats: MissionsStats
  }>
  acceptMission(studentId: string, missionId: string, weekKey?: string): Promise<StudentMission>
  startMission(studentId: string, missionId: string, metadata: string | null, weekKey?: string): Promise<StudentMission>
  completeMission(
    studentId: string,
    missionId: string,
    evidence: string | null,
    verificationResult: VerificationResult | null,
    weekKey?: string
  ): Promise<StudentMission>
  completeVisitMission(studentId: string, missionId: string, visitedUrl: string, weekKey?: string): Promise<StudentMission>
  getVerificationProfile(userId: string): Promise<VerificationProfile | null>
  verifyMission(
    mission: { verificationKey: string | null; verificationValue: string | null },
    userId: string,
    metadata: string | null
  ): Promise<VerificationResult>
  awardPoints(userId: string, amount: number, source: string, description: string, referenceKey?: string): Promise<number>
  createNotification(userId: string, title: string, message: string, type: string, link: string): Promise<void>
}

export { VerificationResult }