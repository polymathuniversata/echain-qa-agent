// Configuration file with environment variables (NEVER commit real secrets!)
export const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'admin',
    password: process.env.DB_PASSWORD || '[REDACTED - USE ENVIRONMENT VARIABLE]',
    apiKey: process.env.DB_API_KEY || '[REDACTED - USE ENVIRONMENT VARIABLE]',
    jwtSecret: process.env.JWT_SECRET || '[REDACTED - USE ENVIRONMENT VARIABLE]'
  },
  externalServices: {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '[REDACTED - USE ENVIRONMENT VARIABLE]',
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '[REDACTED - USE ENVIRONMENT VARIABLE]',
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '[REDACTED - USE ENVIRONMENT VARIABLE]'
  }
};