import assert from "node:assert/strict"
import test from "node:test"

import {
  CreateTeacherRewardUseCase,
  GetStudentRewardsUseCase,
  RedeemRewardUseCase,
  ReviewRewardUseCase,
} from "./rewardUseCases"
import type { RewardServiceRepository } from "@/domain/rewards/repositories/rewardRepository"

function createRepository(overrides: Partial<RewardServiceRepository> = {}): RewardServiceRepository {
  return {
    getStudentRewardsWithEligibility: async () => ({
      rewards: [],
      studentRewards: [],
      enrolledCourses: [],
      totalPoints: 0,
      stats: { totalPoints: 0, totalRewards: 0, availableRewards: 0, usedRewards: 0, byCategory: {} },
    }),
    redeemReward: async () => ({}) as never,
    getTeacherRewards: async () => ({ pending: [], reviewed: [] }),
    createTeacherReward: async () => ({}) as never,
    getTeacherCustomRewards: async () => [],
    reviewReward: async () => ({ success: true, status: "APROBADO" as const }),
    ...overrides,
  }
}

test("CreateTeacherRewardUseCase forwards the assigned course", async () => {
  let receivedCourseId = ""
  const repository = createRepository({
    createTeacherReward: async (data) => {
      receivedCourseId = data.courseId
      return {} as never
    },
  })

  await new CreateTeacherRewardUseCase(repository).execute("teacher-1", {
    name: "Reintento",
    description: "Permite repetir una evaluación",
    icon: "🎁",
    category: "EXAMEN",
    cost: 100,
    teacherId: "ignored-by-use-case",
    courseId: "course-1",
  })

  assert.equal(receivedCourseId, "course-1")
})

test("GetStudentRewardsUseCase forwards student and period", async () => {
  let received: [string, string] | undefined
  const repository = createRepository({
    getStudentRewardsWithEligibility: async (studentId, period) => {
      received = [studentId, period]
      return {
        rewards: [],
        studentRewards: [],
        enrolledCourses: [],
        totalPoints: 0,
        stats: { totalPoints: 0, totalRewards: 0, availableRewards: 0, usedRewards: 0, byCategory: {} },
      }
    },
  })

  await new GetStudentRewardsUseCase(repository).execute("student-1", "2026-2")

  assert.deepEqual(received, ["student-1", "2026-2"])
})

test("RedeemRewardUseCase propagates the repository result", async () => {
  const studentReward = { id: "request-1" } as never
  const repository = createRepository({
    redeemReward: async () => studentReward,
  })

  const result = await new RedeemRewardUseCase(repository).execute("student-1", {
    rewardId: "reward-1",
    courseId: "course-1",
  })

  assert.equal(result.studentReward, studentReward)
})

test("ReviewRewardUseCase propagates review status", async () => {
  const repository = createRepository({
    reviewReward: async () => ({ success: true, status: "RECHAZADO" }),
  })

  const result = await new ReviewRewardUseCase(repository).execute("teacher-1", {
    studentRewardId: "request-1",
    courseId: "course-1",
    decision: "reject",
  })

  assert.deepEqual(result, { success: true, status: "RECHAZADO" })
})
