import path from "path";

export const resolveCodeSmoothDir = () =>
  path.resolve(process.env.HOME || process.env.USERPROFILE || "", "codesmooth");
