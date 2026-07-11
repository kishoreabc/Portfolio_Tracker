import { auth } from "@/auth"
export default auth;

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|login|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
