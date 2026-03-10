export const env = {
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  NEXT_PUBLIC_API_SECRET_KEY:
    process.env.NEXT_PUBLIC_API_SECRET_KEY ||
    process.env.API_SECRET_KEY ||
    "reptrainer-secret-123",
};

export default env;
