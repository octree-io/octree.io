export enum AuthType {
  SIGN_IN = 'signin',
  SIGN_UP = 'signup',
}

export function initiateGoogleOAuth(authType: AuthType): Promise<boolean> {
  return new Promise((resolve, reject) => {
    google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: 'openid profile email',
      callback: (response: any) => {
        if (response.error) {
          console.error('OAuth2 Error:', response.error);
          return reject(false);
        }

        const tokenEndpoint = authType === AuthType.SIGN_IN 
          ? '/auth/google/signin' 
          : '/auth/google/signup';

        fetch(import.meta.env.VITE_API_URL + tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: response.access_token }),
          credentials: "include",
        })
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            console.error('Backend Error:', data.error);
            return reject(false);
          }

          localStorage.setItem("token", data.accessToken);
          resolve(true);
        })
        .catch(err => {
          console.error('Fetch Error:', err);
          reject(false);
        });
      }
    }).requestAccessToken();
  });
}
