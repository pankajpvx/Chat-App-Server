const corsOptions = () => ({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
});

const AUTH_TOKEN = "auth-token";

export { corsOptions, AUTH_TOKEN };
