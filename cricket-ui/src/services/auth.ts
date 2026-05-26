import axios from "axios";

import api, { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "@/lib/api";

export type LoginPayload = {
  phone_number: string;
  password: string;
};

export type SignupPayload = LoginPayload & {
  name: string;
};

export type ForgotPasswordPayload = {
  phone: string;
};

export type VerifyOtpPayload = {
  phone: string;
  otp: string;
  new_password: string;
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

export type PasswordResetResponse = {
  success?: boolean;
  message?: string;
  otp?: string;
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
  const { data } = await api.post<LoginResponse>("/auth/login", payload);
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
  const { data } = await api.post<SignupResponse>("/auth/signup", payload);

  return {
    user: data.data ?? null,
    message: data.message,
    success: data.success,
    response: data,
  };
}

export async function forgotPassword(payload: ForgotPasswordPayload) {
  const { data } = await api.post<PasswordResetResponse>(
    "/auth/forgot-password",
    payload
  );

  return data;
}

export async function verifyOtp(payload: VerifyOtpPayload) {
  const { data } = await api.post<PasswordResetResponse>(
    "/auth/verify-otp",
    payload
  );

  return data;
}

export async function logout() {
  try {
    await api.post("/logout");
  } catch {
    // Local logout should still complete if the token is already missing/expired.
  } finally {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }
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

export function getPasswordResetErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | { message?: string; error?: string }
      | string
      | undefined;
    const message =
      typeof data === "string" ? data : data?.message ?? data?.error ?? "";
    const normalizedMessage = message.toLowerCase();

    if (status === 400 && normalizedMessage.includes("expired otp")) {
      return "OTP invalid/expired, request again";
    }

    if (status === 400 && normalizedMessage.includes("invalid")) {
      return normalizedMessage.includes("otp")
        ? "OTP invalid/expired, request again"
        : "Please fill all required fields";
    }

    if (status === 500) {
      return "Something went wrong. Please try again.";
    }

    return message || "Something went wrong. Please try again.";
  }

  return "Something went wrong. Please try again.";
}
