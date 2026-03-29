import { UserBlock } from '@/models/UserBlock'

export async function isBlockedBetween(userA: string, userB: string) {
  if (!userA || !userB) return false
  const block = await UserBlock.findOne({
    $or: [
      { blocker: userA, blocked: userB },
      { blocker: userB, blocked: userA },
    ],
  }).lean()
  return !!block
}

export async function getBlockState(blocker: string, blocked: string) {
  if (!blocker || !blocked) return { blocked: false }
  const block = await UserBlock.findOne({ blocker, blocked }).lean()
  return { blocked: !!block, block }
}
