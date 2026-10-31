import { deleteAccountAction } from "@/app/actions/account";
import { signOut } from "@/app/actions/auth";
import { saveXProfileAction } from "@/app/actions/profile";
import { UserMenu } from "@/components/account/user-menu";

/** The account menu with its server actions, shared by the calendar and the plan page. */
export function AccountMenu({
  name,
  email,
  handle,
}: {
  name: string;
  email: string;
  handle: string | null;
}) {
  return (
    <UserMenu
      name={name}
      email={email}
      handle={handle}
      saveProfile={saveXProfileAction}
      signOut={signOut}
      deleteAccount={deleteAccountAction}
    />
  );
}
