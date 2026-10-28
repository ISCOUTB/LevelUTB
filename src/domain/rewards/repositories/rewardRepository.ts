import type { PointSourceEnum, Reward, StudentReward, EnrolledCourse, RewardsStats, TeacherRewardsResponse, RedemptionInput, ReviewInput } from "../types"
import type { RewardCategory } from "@prisma/client"

export interface RewardRepository {
  findActiveRewards(): Promise<Reward[]>
  findById(rewardId: string): Promise<Reward | null>
  createTeacherReward(data: {
    name: string
    description: string
    icon: string
    category: RewardCategory
    cost: number
    teacherId: string
    courseId: string
  }): Promise<Reward>
  getTeacherRewards(teacherUserId: string): Promise<Reward[]>
}

export interface StudentRewardRepository {
  findByStudentId(studentId: string): Promise<StudentReward[]>
  findByStudentIdAndRewardIdAndCourseId(studentId: string, rewardId: string, courseId: string, status: string): Promise<StudentReward | null>
  countByStudentIdAndRewardId(studentId: string, rewardId: string, excludeStatus?: string): Promise<number>
  create(data: { studentId: string; rewardId: string; courseId: string; status: string; pointsSpent: number; evidence: string | null; expiresAt: Date }): Promise<StudentReward>
  update(id: string, data: Partial<StudentReward>): Promise<StudentReward>
  findById(studentRewardId: string): Promise<StudentReward | null>
  findPendingByStudentIds(studentIds: string[], courseIds: string[]): Promise<StudentReward[]>
  findReviewedByStudentIds(studentIds: string[], courseIds: string[], take?: number): Promise<StudentReward[]>
}

export interface PointRepository {
  sumByUserId(userId: string, periodCode?: string): Promise<number>
  create(data: { userId: string; amount: number; source: PointSourceEnum; description: string; periodCode?: string; referenceKey?: string }): Promise<void>
}

export interface RewardServiceRepository {
  getStudentRewardsWithEligibility(studentId: string, period: string): Promise<{
    rewards: Reward[]
    studentRewards: StudentReward[]
    enrolledCourses: EnrolledCourse[]
    totalPoints: number
    stats: RewardsStats
  }>
  redeemReward(studentId: string, input: RedemptionInput): Promise<StudentReward>
  getTeacherRewards(teacherUserId: string): Promise<TeacherRewardsResponse>
  createTeacherReward(data: {
    name: string
    description: string
    icon: string
    category: RewardCategory
    cost: number
    teacherId: string
    courseId: string
  }): Promise<Reward>
  getTeacherCustomRewards(teacherUserId: string): Promise<Reward[]>
  reviewReward(teacherUserId: string, input: ReviewInput): Promise<{ success: boolean; status: "APROBADO" | "RECHAZADO" }>
}