import ForgotPasswordLayout from "@/components/pages/password-reset/forgot-password-layout";
import PasswordResetForm from "@/components/pages/password-reset/password-reset-form";

const PasswordResetPage = () => {
  return (
    <ForgotPasswordLayout>
      <PasswordResetForm />
    </ForgotPasswordLayout>
  );
};

export default PasswordResetPage;
