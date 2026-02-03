import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, organizationClient } from "better-auth/client/plugins";
import { ac } from "@repo/types/auth";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        username: {
          type: "string",
          required: true,
        },
      },
    }),
    organizationClient({
      ac,
      dynamicAccessControl: {
        enabled: true,
      },
    }),
  ],
});
