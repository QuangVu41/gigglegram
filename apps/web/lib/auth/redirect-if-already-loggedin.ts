import { DEFAULT_LOGIN_REDIRECT } from "@/constants/routes";
import { authClient } from "@/lib/auth/auth-client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const redirectIfAlreadyLoggedin = async () => {
  const { data } = await authClient.getSession({ fetchOptions: { headers: await headers() } });
  if (data?.session) redirect(DEFAULT_LOGIN_REDIRECT);
};
