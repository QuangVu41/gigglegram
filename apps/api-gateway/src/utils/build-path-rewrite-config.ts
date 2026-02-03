export const buildPathRewriteConfig = (servicePath: string) => {
  return (path: string) => {
    const cleanPath =
      path.startsWith('/?') || (path.startsWith('/') && path.length === 1)
        ? path.slice(1)
        : path;

    return `/api/${servicePath}${cleanPath}`;
  };
};
