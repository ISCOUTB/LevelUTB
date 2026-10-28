import type { Reward, StudentReward, EnrolledCourse, RewardsStats, TeacherRewardsResponse, RedemptionInput, ReviewInput } from "@/domain/rewards/types"
import type { RewardServiceRepository } from "@/domain/rewards/repositories/rewardRepository"
import type { RewardCategory } from "@prisma/client"

export interface GetStudentRewardsResult {
  rewards: Reward[]
  studentRewards: StudentReward[]
  enrolledCourses: EnrolledCourse[]
  totalPoints: number
  stats: RewardsStats
}

export interface RedeemRewardResult {
  studentReward: StudentReward
}

export interface GetTeacherRewardsResult {
  pending: TeacherRewardsResponse["pending"]
  reviewed: TeacherRewardsResponse["reviewed"]
}

export interface CreateTeacherRewardData {
  name: string
  description: string
  icon: string
  category: RewardCategory
  cost: number
  teacherId: string
  courseId: string
}

export interface CreateTeacherRewardResult {
  reward: Reward
}

export class CreateTeacherRewardUseCase {
  constructor(private readonly rewardServiceRepository: RewardServiceRepository) {}

  async execute(teacherUserId: string, data: CreateTeacherRewardData): Promise<{ reward: Reward }> {
    const reward = await this.rewardServiceRepository.createTeacherReward({
      name: data.name,
      description: data.description,
      icon: data.icon,
      category: data.category,
      cost: data.cost,
      teacherId: teacherUserId,
      courseId: data.courseId,
    })
    return { reward }
  }

  async getTeacherCustomRewards(teacherUserId: string): Promise<Reward[]> {
    return this.rewardServiceRepository.getTeacherCustomRewards(teacherUserId)
  }
}

export class GetStudentRewardsUseCase {
  constructor(private readonly rewardServiceRepository: RewardServiceRepository) {}

  async execute(studentId: string, period: string): Promise<GetStudentRewardsResult> {
    return this.rewardServiceRepository.getStudentRewardsWithEligibility(studentId, period)
  }
}

export class RedeemRewardUseCase {
  constructor(private readonly rewardServiceRepository: RewardServiceRepository) {}

  async execute(studentId: string, input: RedemptionInput): Promise<RedeemRewardResult> {
    const studentReward = await this.rewardServiceRepository.redeemReward(studentId, input)
    return { studentReward }
  }
}

export class GetTeacherRewardsUseCase {
  constructor(private readonly rewardServiceRepository: RewardServiceRepository) {}

  async execute(teacherUserId: string): Promise<GetTeacherRewardsResult> {
    return this.rewardServiceRepository.getTeacherRewards(teacherUserId)
  }
}

export class ReviewRewardUseCase {
  constructor(private readonly rewardServiceRepository: RewardServiceRepository) {}

  async execute(teacherUserId: string, input: ReviewInput): Promise<{ success: boolean; status: "APROBADO" | "RECHAZADO" }> {
    return this.rewardServiceRepository.reviewReward(teacherUserId, input)
  }
}