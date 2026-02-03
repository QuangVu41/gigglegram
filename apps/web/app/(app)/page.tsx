import BAActionButton from "@/components/common/ba-action-button";
import { authClient } from "@/lib/auth/auth-client";

const HomePage = () => {
  return (
    <BAActionButton
      action={() => authClient.signOut()}
      pendingMessage="Signing out..."
      successMessage="Successfully signed out!"
    >
      Sign Out
    </BAActionButton>
  );
};

export default HomePage;
