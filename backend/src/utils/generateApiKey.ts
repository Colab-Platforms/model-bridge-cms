import crypto from "crypto";

export const generateApiKey = () => {
  const prefix = "mb_live";

  const secret = crypto
    .randomBytes(32)
    .toString("hex");

  const apiKey = `${prefix}_${secret}`;

  const keyHash = crypto
    .createHash("sha256")
    .update(apiKey)
    .digest("hex");

  return {
    apiKey,
    keyHash,
    keyPrefix: prefix,
  };
};