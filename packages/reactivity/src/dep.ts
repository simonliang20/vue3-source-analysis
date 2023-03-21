import { ReactiveEffect, trackOpBit } from './effect'

export type Dep = Set<ReactiveEffect> & TrackedMarkers

/**
 * wasTracked and newTracked maintain the status for several levels of effect
 * tracking recursion. One bit per level is used to define whether the dependency
 * was/is tracked.
 */
type TrackedMarkers = {
  /**
   * wasTracked
   */
  w: number
  /**
   * newTracked
   */
  n: number
}

/**
 * 创建空的依赖(a set)
 */
export const createDep = (effects?: ReactiveEffect[]): Dep => {
  const dep = new Set<ReactiveEffect>(effects) as Dep
  dep.w = 0
  dep.n = 0
  return dep
}

/**
 * 依赖是否是已被收集
 */
export const wasTracked = (dep: Dep): boolean => (dep.w & trackOpBit) > 0

/**
 * 依赖是否重新收集（tips: effect中的fn执行时访问到触发依赖，会标记依赖为重新收集）
 */
export const newTracked = (dep: Dep): boolean => (dep.n & trackOpBit) > 0

/**
 * 初始化已有依赖为已被收集
 */
export const initDepMarkers = ({ deps }: ReactiveEffect) => {
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].w |= trackOpBit // set was tracked
    }
  }
}

/**
 * 找出实际无法访问的依赖dep（可能是由于if条件被排除），将其清除掉
 * @param effect
 */
export const finalizeDepMarkers = (effect: ReactiveEffect) => {
  const { deps } = effect
  if (deps.length) {
    let ptr = 0
    for (let i = 0; i < deps.length; i++) {
      const dep = deps[i]
      // 曾经已收集过的依赖，但是并不能再在effct的fn中访问到，那就意味着该依赖无法访问，故清除该依赖
      if (wasTracked(dep) && !newTracked(dep)) {
        dep.delete(effect)
      } else {
        deps[ptr++] = dep
      }
      // clear bits
      dep.w &= ~trackOpBit
      dep.n &= ~trackOpBit
    }
    deps.length = ptr
  }
}
