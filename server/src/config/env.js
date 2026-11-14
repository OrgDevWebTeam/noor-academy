import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "staging", "production"]),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE: z
    .string()
    .min(1)
    .refine((v) => v.includes("<PASSWORD>"), {
      message: "must contain the <PASSWORD> placeholder",
    }),
  DATABASE_PASSWORD: z.string().min(1),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:");
  for (const issue of result.error.issues) {
    console.error(` - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

const env = result.data;

const config = Object.freeze({
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE.replace("<PASSWORD>", encodeURIComponent(env.DATABASE_PASSWORD)),
});

export default config;
