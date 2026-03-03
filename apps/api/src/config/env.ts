import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  GEMINI_API_KEY: z.string().optional(),
  GOOGLE_CLOUD_PROJECT: z.string().min(1, "GOOGLE_CLOUD_PROJECT is required"),
  GOOGLE_CLOUD_LOCATION: z.string().default("us-central1"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
