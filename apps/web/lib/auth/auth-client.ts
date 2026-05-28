import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, organizationClient, adminClient } from "better-auth/client/plugins";
import { ac } from "@repo/types/auth";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        username: {
          type: "string",
          required: true,
        },
        bio: {
          type: "string",
          required: false,
        },
        gender: {
          type: "string",
          required: false,
        },
      },
    }),
    adminClient(),
    organizationClient({
      ac: ac as any,
      dynamicAccessControl: {
        enabled: true,
      },
    }),
  ],
});
