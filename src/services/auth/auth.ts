import Fastify from "fastify";
import crypto from "crypto";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import path from "path";
import open from "open";
import { LoggedUser, TokenResponse } from "./auth.types.js";
import { codesmoothCliAuth } from "./AuthManager.js";

const config = {
  clientId: "da2b1a1e-2887-4731-af07-551abb5d3831",
  redirectUrl: "http://localhost:45110/callback",
  fusionAuthBaseUrl: "https://codesmooth.fusionauth.io",
  baseUrl: "https://app.codesmooth.dev",
};

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string) {
  const hash = crypto.createHash("sha256");
  hash.update(verifier);
  return hash.digest("base64url");
}

export async function authorize(): Promise<void> {
  const fastify = Fastify({ logger: false });
  const state = uuidv4();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  return new Promise((resolve, reject) => {
    fastify.get("/callback", async (request, reply) => {
      const { state: queryState, code } = request.query as {
        state: string;
        code: string;
      };

      if (queryState !== state) {
        await reply.code(400).send("State mismatch");
        reject(new Error("State mismatch"));
        return;
      }

      try {
        const tokenResponse = await fetch(
          `${config.fusionAuthBaseUrl}/oauth2/token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              client_id: config.clientId!,
              code,
              code_verifier: codeVerifier,
              redirect_uri: config.redirectUrl!,
            }),
          }
        );

        const tokens = (await tokenResponse.json()) as TokenResponse;

        console.log("tokens", tokens);

        await codesmoothCliAuth.saveTokens(
          tokens.access_token,
          tokens.refresh_token
        );

        await reply.redirect("https://app.codesmooth.dev/auth/cli/success");
        console.log(
          "✅ Pomyślnie zalogowano. Możesz teraz zamknąć okno przeglądarki."
        );

        await fastify.close();
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    fastify.listen({ port: 45110 }, async (err) => {
      if (err) {
        reject(err);
        return;
      }

      const authUrl = new URL(`${config.fusionAuthBaseUrl}/oauth2/authorize`);
      authUrl.searchParams.append("client_id", config.clientId!);
      authUrl.searchParams.append("redirect_uri", config.redirectUrl!);
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("state", state);
      authUrl.searchParams.append("code_challenge", codeChallenge);
      authUrl.searchParams.append("code_challenge_method", "S256");
      authUrl.searchParams.append(
        "scope",
        "openid profile email offline_access"
      );

      console.log("Opening browser to authenticate...");

      open(authUrl.toString());
    });
  });
}

export async function requireUser() {
  try {
    const tokens = await loadTokens();
    if (!tokens?.access_token) {
      throw new Error("No tokens found");
    }
  } catch (error) {
    console.error("Unauthorized. Login with `codesmooth auth login` command.");
    process.exit(1);
  }
}

export async function requireAdmin() {
  try {
    const tokens = await loadTokens();
    if (!tokens?.access_token) {
      throw new Error("No tokens found");
    }

    const response = await fetch(`${config.baseUrl}/cli/getMe`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (response.status === 403) {
      console.error("Unauthorized. Admin access required.");
      process.exit(1);
    }

    const user = (await response.json()) as LoggedUser;
    const roles = user.oAuthProfile?.roles || [];

    if (!roles.includes("admin")) {
      console.error("Unauthorized. Admin access required.");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error during authentication check:", error);
    process.exit(1);
  }
}

async function loadTokens() {
  const configPath = path.join(".", "config.json");
  const data = await fs.readFile(configPath, "utf8");
  return JSON.parse(data);
}
