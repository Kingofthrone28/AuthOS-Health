export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/(dashboard|cases|voice|analytics|documents|settings)(.*)",
  ],
};
