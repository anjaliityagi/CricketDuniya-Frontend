import axios from "axios";

import api, { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "@/lib/api";

export type LoginPayload = {
  phone_number: string;
  password: string;
};

export type SignupPayload = LoginPayload & {
  name: string;
};

export type AuthUser = {
  id?: string | number;
  name?: string;
  phone_number?: string;
  phoneNumber?: string;
  profile_image?: string | null;
  created_at?: string;
  updated_at?: string;
  email?: string;
  [key: string]: unknown;
};

export type LoginResponse = {
  token?: string;
  access_token?: string;
  accessToken?: string;
  jwt?: string;
  user?: AuthUser;
  data?: {
    token?: string;
    access_token?: string;
    accessToken?: string;
    jwt?: string;
    user?: AuthUser;
    [key: string]: unknown;
  };
  message?: string;
  [key: string]: unknown;
};

export type SignupResponse = {
  data?: AuthUser;
  message?: string;
  success?: boolean;
  [key: string]: unknown;
};

function getToken(response: LoginResponse) {
  return (
    response.token ??
    response.access_token ??
    response.accessToken ??
    response.jwt ??
    response.data?.token ??
    response.data?.access_token ??
    response.data?.accessToken ??
    response.data?.jwt ??
    ""
  );
}

function getUser(response: LoginResponse) {
  return response.user ?? response.data?.user ?? null;
}

export function getStoredAuth() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const storedUser = localStorage.getItem(AUTH_USER_KEY);

  return {
    token,
    user: storedUser ? (JSON.parse(storedUser) as AuthUser) : null,
  };
}

export async function login(payload: LoginPayload) {
  const { data } = await api.post<LoginResponse>("/v1/auth/login", payload);
  const token = getToken(data);
  const user = getUser(data);

  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }

  return { token, user, response: data };
}

export async function signup(payload: SignupPayload) {
  const { data } = await api.post<SignupResponse>("/v1/auth/signup", payload);

  return {
    user: data.data ?? null,
    message: data.message,
    success: data.success,
    response: data,
  };
}

export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getAuthErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | string
      | undefined;

    if (typeof data === "string") {
      return data;
    }

    return data?.message ?? data?.error ?? "Login failed. Please try again.";
  }

  return "Something went wrong. Please try again.";
}
