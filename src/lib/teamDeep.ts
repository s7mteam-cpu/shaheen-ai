/** All deep per-tool playbooks (restaurant and clinic live in team.ts), merged. */
import { DEEP1, type DeepT } from "./teamDeep1";
import { DEEP2 } from "./teamDeep2";
import { DEEP3 } from "./teamDeep3";
export const DEEP_MORE: Record<string, DeepT> = { ...DEEP1, ...DEEP2, ...DEEP3 };
