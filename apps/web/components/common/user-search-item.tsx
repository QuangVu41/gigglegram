import { users } from "@repo/database";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUsernameFallback } from "@/lib/utils";

interface UserSearchItemProps {
  user: typeof users.$inferSelect;
}

const UserSearchItem = ({ user }: UserSearchItemProps) => {
  return (
    <div className="flex items-center gap-3 w-full">
      <Avatar className="h-7 w-7 rounded-full">
        <AvatarImage
          src={`/${user.image}` || "/default-avatar.png"}
          alt={user.name}
        />
        <AvatarFallback className="rounded-lg">
          {getUsernameFallback(user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="space-y-1">
        <h3 className="h-4 w-62.5">{user.name}</h3>
        <h4 className="h-4 w-50 text-foreground/70">{user.username}</h4>
      </div>
    </div>
  );
};

export default UserSearchItem;
