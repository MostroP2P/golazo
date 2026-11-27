/**
 * The plan, bundled at build time (SPEC 7.3) and validated as the app starts.
 * Never fetched from a file next to the page: changing a target is a pull
 * request and a deploy.
 */
import raw from '../../config/plan-2027.json'
import { validatePlan } from './validate'
import type { PlanResult } from './types'

export const PLAN: PlanResult = validatePlan(raw)
