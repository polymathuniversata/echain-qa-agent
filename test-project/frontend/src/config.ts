// Configuration file with sensitive data
export const config = {
  database: {
    host: 'localhost',
    port: 5432,
    username: 'admin',
    password: 'super_secret_password_123',
    apiKey: 'sk-1234567890abcdef',
    jwtSecret: 'my_jwt_secret_key_that_should_not_be_exposed'
  },
  externalServices: {
    stripeSecretKey: 'sk_test_FAKE_STRIPE_TEST_KEY_FOR_TESTING_ONLY',
    awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
  }
};