/** "الإبقاء على تسجيل الدخول": when the user unticks it we store shaheen_remember=0
 *  (a session cookie), and every Supabase auth cookie is then written without
 *  maxAge/expires, so the browser forgets the login when it is closed. */
export const REMEMBER_COOKIE = "shaheen_remember";

type Opts = { maxAge?: number; expires?: Date; [k: string]: unknown } | undefined;

export function sessionOnly<T extends Opts>(options: T, remember: boolean): T {
  if (remember || !options) return options;
  // keep deletions (maxAge 0) as they are
  if (options.maxAge !== undefined && options.maxAge <= 0) return options;
  const { maxAge: _m, expires: _e, ...rest } = options;
  void _m; void _e;
  return rest as T;
}

export const wantsRemember = (value: string | undefined) => value !== "0";
