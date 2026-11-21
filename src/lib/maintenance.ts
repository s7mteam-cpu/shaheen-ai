/** «وضع الصيانة»: kept as one row in site_content (key «maintenance», value {on: boolean}). */
export const MAINTENANCE_KEY = "maintenance";
/** paths that stay open while it is on, so the admin can always sign in and switch it off */
export const MAINTENANCE_OPEN = ["/login", "/auth", "/admin", "/maintenance"];
