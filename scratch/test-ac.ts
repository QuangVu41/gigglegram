import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements as orgStatements,
  ownerAc,
} from "better-auth/plugins/organization/access";
import {
  defaultStatements as adminStatements,
  adminAc,
} from "better-auth/plugins/admin/access";

const statements = {
  ...orgStatements,
  ...adminStatements,
  post: ["read", "create", "update", "delete"],
  setting: ["read", "update", "create", "delete"],
  story: ["read", "create", "delete"],
  highlight: ["read", "create", "update", "delete"],
  collection: ["read", "create", "update", "delete"],
  report: ["read", "create", "update", "delete", "assign-reviewer"],
} as const;

const ac = createAccessControl(statements);

const owner = ac.newRole({
  post: ["read", "create", "update", "delete"],
  setting: ["read", "update", "create", "delete"],
  story: ["read", "create", "delete"],
  highlight: ["read", "create", "update", "delete"],
  collection: ["read", "create", "update", "delete"],
  report: ["read", "create", "update", "delete", "assign-reviewer"],
  ...adminAc.statements,
  ...ownerAc.statements,
});

import { organization } from "better-auth/plugins";

const org = organization({
  ac: ac,
  roles: {
    owner,
  },
});
