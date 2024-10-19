import apiClient, { TokenExpiredError } from "../client/APIClient";

export const refreshAccessToken = async (): Promise<string | false> => {
  let retries = 3;
  let delay = 1000;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response: any = await apiClient.get("/auth/refresh-token");
      const { accessToken } = response;
      localStorage.setItem("token", accessToken);
      return accessToken;
    } catch (e) {
      console.log(`[refreshAccessToken] Attempt ${attempt} failed to refresh token, retrying`, e);

      if (e instanceof TokenExpiredError) {
        return false;
      }

      if (attempt === retries) {
        // Retrying the max amount of times likely means that the token is stale and/or invalid
        // Removing the token should trigger a re-login
        console.log("[refreshAccessToken] Max retries reached, deleting token");
        localStorage.removeItem("token");
        return false;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));

      delay *= 2;
    }
  }

  return false;
};