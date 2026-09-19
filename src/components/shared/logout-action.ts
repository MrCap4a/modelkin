"use server";

import { redirect } from "next/navigation";
import { logoutUser, getClientIp } from "@modules/auth";

export async function logoutAction(): Promise<void> {
  const ip = await getClientIp();
  await logoutUser({ ip });
  redirect("/");
}
