import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  sub: string;
  email: string;
  mfa_verified: boolean;
}

export interface AuthState {
  status: "idle" | "authenticating" | "authenticated" | "error";
  accessToken: string | null;
  elevatedToken: string | null;
  user: AuthUser | null;
}

const initialState: AuthState = {
  status: "idle",
  accessToken: null,
  elevatedToken: null,
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginStarted(state) {
      state.status = "authenticating";
    },
    loginSucceeded(
      state,
      action: PayloadAction<{ accessToken: string; user: AuthUser }>,
    ) {
      state.status = "authenticated";
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
    },
    tokenRefreshed(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      state.status = "authenticated";
    },
    mfaElevated(state, action: PayloadAction<string>) {
      state.elevatedToken = action.payload;
    },
    elevationExpired(state) {
      state.elevatedToken = null;
    },
    loggedOut(state) {
      state.status = "idle";
      state.accessToken = null;
      state.elevatedToken = null;
      state.user = null;
    },
  },
});

export const {
  loginStarted,
  loginSucceeded,
  tokenRefreshed,
  mfaElevated,
  elevationExpired,
  loggedOut,
} = authSlice.actions;

export const selectAccessToken = (state: { auth: AuthState }) =>
  state.auth.accessToken;
export const selectElevatedToken = (state: { auth: AuthState }) =>
  state.auth.elevatedToken;
export const selectAuthStatus = (state: { auth: AuthState }) =>
  state.auth.status;
export const selectAuthUser = (state: { auth: AuthState }) =>
  state.auth.user;

export default authSlice.reducer;
