export const ADMIN_EMAILS = ['fernandodiazfalu@gmail.com'];

export function isAdmin(session) {
  return !!session?.user?.email && ADMIN_EMAILS.includes(session.user.email);
}
