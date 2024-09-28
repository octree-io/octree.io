import axios, { AxiosInstance } from 'axios';

export class TokenExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

class APIClient {
  private api: AxiosInstance;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Function[] = [];

  constructor(baseURL: string) {
    this.api = axios.create({
      baseURL,
      withCredentials: true,
    });

    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token && config.headers) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const token = localStorage.getItem('token');

          if (!token) {
            throw new TokenExpiredError('No access token found, need to login.');
          }

          return this.handle401Error(originalRequest);
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string | null> {
    console.log("Refreshing access token");
    try {
      const response = await this.api.get('/auth/refresh-token');
      const { accessToken } = response.data;
      if (accessToken) {
        localStorage.setItem('token', accessToken);
        return accessToken;
      }
      return null;
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      return null;
    }
  }

  private subscribeTokenRefresh(callback: Function) {
    this.refreshSubscribers.push(callback);
  }

  private onAccessTokenRefreshed(accessToken: string) {
    this.refreshSubscribers.forEach((callback) => callback(accessToken));
    this.refreshSubscribers = [];
  }

  private async handle401Error(originalRequest: any): Promise<any> {
    console.log("Handling 401 error");
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      const newAccessToken = await this.refreshAccessToken();
      this.isRefreshing = false;

      if (newAccessToken) {
        this.onAccessTokenRefreshed(newAccessToken);
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return this.api(originalRequest);
      } else {
        throw new TokenExpiredError('Both tokens expired, need to login again.');
      }
    }

    return new Promise((resolve) => {
      this.subscribeTokenRefresh((newToken: string) => {
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        resolve(this.api(originalRequest));
      });
    });
  }

  public async get<T>(url: string): Promise<T> {
    try {
      const response = await this.api.get<T>(url);
      return response.data;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        console.log('Tokens expired, redirecting to login');
        throw error;
      }
      throw error;
    }
  }

  public async post<T>(url: string, data: any): Promise<T> {
    try {
      const response = await this.api.post<T>(url, data);
      return response.data;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        console.log('Tokens expired, redirecting to login');
        throw error;
      }
      throw error;
    }
  }

  public login(accessToken: string) {
    localStorage.setItem('token', accessToken);
  }

  public logout() {
    localStorage.removeItem('token');
    return this.api.post('/logout');
  }
}

const apiClient = new APIClient(import.meta.env.VITE_API_URL);
export default apiClient;
