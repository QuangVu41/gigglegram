import { Card, CardContent } from "@/components/ui/card";

const ForgotPasswordLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col gap-6">
        <Card className="p-0">
          <CardContent className="p-0">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordLayout;
