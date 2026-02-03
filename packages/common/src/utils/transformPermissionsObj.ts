import { PermissionSet } from '@repo/types';

export const transformPermissionsObj = (permissionSet: PermissionSet) => {
  const permissions: { [key: string]: string[] } = {};

  Object.entries(permissionSet.permissions).forEach(([resouce, actionList]) => {
    permissions[resouce] = actionList.actions;
  });

  return permissions;
};
