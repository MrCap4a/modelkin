import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@modules/auth";
import { getUserProfile } from "@modules/users";
import { listOwnedModels } from "@modules/downloads";
import { listUserOrderHistory } from "@modules/orders";
import { isAuthor } from "@modules/authors";
import { formatPriceRub } from "@modules/models";
import { logoutAction } from "@components/shared/logout-action";
import { ProfileShell } from "./_components/profile-shell";
import { AvatarUploader } from "./_components/avatar-uploader";
import { ChangePasswordToggle } from "./_components/change-password-toggle";
import { ProfileDetailsForm } from "./_components/profile-details-form";

export const metadata: Metadata = { title: "Мой профиль" };

function formatMemberSince(date: Date): string {
  return `На сайте с ${date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}`;
}

export default async function ProfilePage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    redirect("/login");
  }

  const [profile, ownedModels, orderHistory, authorFlag] = await Promise.all([
    getUserProfile(sessionUser.id),
    listOwnedModels(sessionUser.id),
    listUserOrderHistory(sessionUser.id),
    isAuthor(sessionUser.id),
  ]);

  if (!profile) {
    redirect("/login");
  }

  const totalInvested = orderHistory
    .filter((order) => order.status === "PAID")
    .reduce((sum, order) => sum + order.totalAmount, 0);
  const activeOrders = orderHistory.filter((order) => order.status === "PENDING_PAYMENT").length;

  return (
    <ProfileShell heading="Личный кабинет" active="profile" showAuthorTab={authorFlag}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-card border border-border bg-surface p-6">
          <AvatarUploader name={profile.name ?? profile.email} avatarUrl={profile.avatarUrl} />
          <p className="mt-3 text-center text-sm text-ink-muted">{formatMemberSince(profile.createdAt)}</p>
          <div className="mt-5 border-t border-border pt-5">
            <ChangePasswordToggle />
          </div>
          <div className="mt-3">
            <form action={logoutAction}>
              <button
                type="submit"
                className="w-full rounded-control border border-border px-4 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-alt hover:text-danger"
              >
                Выйти из аккаунта
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <ProfileDetailsForm initialName={profile.name ?? ""} email={profile.email} />

          <div>
            <h2 className="text-lg font-bold text-ink">Моя статистика</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-card border border-border bg-surface p-5">
                <p className="text-sm text-ink-muted">Загружено моделей</p>
                <p className="mt-1 text-2xl font-bold text-ink">{ownedModels.length}</p>
              </div>
              <div className="rounded-card border border-border bg-surface p-5">
                <p className="text-sm text-ink-muted">Всего инвестировано</p>
                <p className="mt-1 text-2xl font-bold text-primary">{formatPriceRub(totalInvested)}</p>
              </div>
              <div className="rounded-card border border-border bg-surface p-5">
                <p className="text-sm text-ink-muted">Активных заказов</p>
                <p className="mt-1 text-2xl font-bold text-ink">{activeOrders}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProfileShell>
  );
}
