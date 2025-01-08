import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";
import keytar from "keytar";

class AuthManager {
  private serviceName: string;
  private configDir: string;
  private tokensPath: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.configDir =
      process.platform === "win32"
        ? path.join(
            process.env.APPDATA ||
              path.join(os.homedir(), "AppData", "Roaming"),
            serviceName
          )
        : path.join(os.homedir(), ".config", serviceName);
    this.tokensPath = path.join(this.configDir, "codesmooth.json");
  }

  private async encryptData(
    data: object
  ): Promise<{ iv: string; encryptedData: string; authTag: string }> {
    const encryptionKey = crypto.randomBytes(32);
    await keytar.setPassword(
      this.serviceName,
      "encryption-key",
      encryptionKey.toString("hex")
    );

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), "utf8"),
      cipher.final(),
    ]);

    return {
      iv: iv.toString("hex"),
      encryptedData: encrypted.toString("hex"),
      authTag: cipher.getAuthTag().toString("hex"),
    };
  }

  private async decryptData(encryptedData: {
    iv: string;
    encryptedData: string;
    authTag: string;
  }): Promise<any> {
    const keyHex = await keytar.getPassword(this.serviceName, "encryption-key");
    if (!keyHex) return null;

    const encryptionKey = Buffer.from(keyHex, "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey,
      Buffer.from(encryptedData.iv, "hex")
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData.encryptedData, "hex")),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf8"));
  }

  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    const tokens = {
      accessToken,
      refreshToken,
      createdAt: Date.now(),
    };

    const encryptedData = await this.encryptData(tokens);

    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true, mode: 0o700 });
    }

    fs.writeFileSync(this.tokensPath, JSON.stringify(encryptedData), {
      mode: 0o600,
    });
  }

  async getTokens(): Promise<any> {
    try {
      const encryptedData = JSON.parse(
        fs.readFileSync(this.tokensPath, "utf8")
      );
      return await this.decryptData(encryptedData);
    } catch (error) {
      return null;
    }
  }

  async clearTokens(): Promise<void> {
    try {
      await keytar.deletePassword(this.serviceName, "encryption-key");
      fs.unlinkSync(this.tokensPath);
    } catch (error) {
      // Ignore errors if files don't exist
    }
  }

  async refreshTokens(
    refreshCallback: (
      refreshToken: string
    ) => Promise<{ accessToken: string; refreshToken: string }>
  ): Promise<any> {
    const tokens = await this.getTokens();
    if (!tokens?.refreshToken) return null;

    try {
      const newTokens = await refreshCallback(tokens.refreshToken);
      await this.saveTokens(newTokens.accessToken, newTokens.refreshToken);
      return newTokens;
    } catch (error) {
      await this.clearTokens();
      return null;
    }
  }
}

export const codesmoothCliAuth = new AuthManager("codesmooth-cli");

// Usage example:
/*
const auth = new AuthManager('my-cli-app');

// After login
await auth.saveTokens(accessToken, refreshToken);

// Before making API requests
const tokens = await auth.getTokens();
if (tokens?.accessToken) {
  // Make authenticated request
}

// Refresh tokens when needed
await auth.refreshTokens(async (refreshToken) => {
  // Call your refresh token API endpoint
  const response = await api.refresh(refreshToken);
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken
  };
});

// On logout
await auth.clearTokens();
*/
