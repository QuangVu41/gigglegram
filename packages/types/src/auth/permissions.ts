import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements as orgStatements, ownerAc } from "better-auth/plugins/organization/access";
import { defaultStatements as adminStatements, adminAc } from "better-auth/plugins/admin/access";

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
  post: statements.post as unknown as [(typeof statements.post)[number]],
  setting: statements.setting as unknown as [(typeof statements.setting)[number]],
  story: statements.story as unknown as [(typeof statements.story)[number]],
  highlight: statements.highlight as unknown as [(typeof statements.highlight)[number]],
  collection: statements.collection as unknown as [(typeof statements.collection)[number]],
  report: statements.report as unknown as [(typeof statements.report)[number]],
  ...adminAc.statements,
  ...ownerAc.statements,
});

type AcStatementsTypes = typeof ac.statements;

export { ac, owner, type AcStatementsTypes };
