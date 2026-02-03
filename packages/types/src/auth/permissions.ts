import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, ownerAc } from "better-auth/plugins/organization/access";

const statements = {
  ...defaultStatements,
  post: ["read", "create", "update", "delete"],
  setting: ["read", "update", "create", "delete"],
  story: ["read", "create", "delete"],
  highlight: ["read", "create", "update", "delete"],
} as const;

const ac = createAccessControl(statements);

const owner = ac.newRole({
  post: statements.post as unknown as [(typeof statements.post)[number]],
  setting: statements.setting as unknown as [(typeof statements.setting)[number]],
  story: statements.story as unknown as [(typeof statements.story)[number]],
  highlight: statements.highlight as unknown as [(typeof statements.highlight)[number]],
  ...ownerAc.statements,
});

type AcStatementsTypes = typeof ac.statements;

export { ac, owner, type AcStatementsTypes };
