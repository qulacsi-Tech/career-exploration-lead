/**
 * A readable flag that says "a session exists", and nothing more. The site header
 * checks it so a visitor with no session costs no request at all. It carries no
 * identity and grants no access: the httpOnly token cookie is what the API honours.
 *
 * Its own module because the header is a client component and lib/user-session.ts
 * imports next/headers, which only server code can.
 */
export const USER_HINT_COOKIE = "tcp_signed_in";
