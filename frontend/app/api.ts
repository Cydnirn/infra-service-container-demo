// Server-side API layer for React Router v7 SSR.
// All calls — Cognito auth AND backend data — run exclusively in
// loaders and actions on the Node.js server. The browser never calls
// any external API directly.
//
// Cognito REST API reference:
//   https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/
//
// Backend calls use Kubernetes internal DNS (server-side only).

// ── Configuration ──────────────────────────────────────────

function getCognitoConfig() {
  return {
    region: process.env.COGNITO_REGION || "us-east-1",
    userPoolId:
      process.env.COGNITO_USER_POOL_ID ||
      "REPLACE_WITH_COGNITO_USER_POOL_ID",
    clientId:
      process.env.COGNITO_CLIENT_ID || "REPLACE_WITH_COGNITO_CLIENT_ID",
  };
}

function getBackendURL(): string {
  return process.env.API_URL || "http://student-backend:8080";
}

// ── Auth helpers ────────────────────────────────────────────

function getAuthToken(request: Request): string | null {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getAuthHeaders(request: Request): Record<string, string> {
  const token = getAuthToken(request);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// ── Cognito REST API (server-side only) ─────────────────────

interface CognitoAuthResult {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

interface CognitoRegisterResult {
  userSub: string;
  userConfirmed: boolean;
}

/**
 * Authenticate with Cognito via the InitiateAuth REST API.
 * Uses USER_PASSWORD_AUTH — the SSR server sends credentials directly
 * (user never sees this network call).
 */
export async function cognitoLogin(
  email: string,
  password: string,
): Promise<CognitoAuthResult> {
  const config = getCognitoConfig();
  const endpoint = `https://cognito-idp.${config.region}.amazonaws.com/`;

  const body = JSON.stringify({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: config.clientId,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err.message || err.__type || `Cognito InitiateAuth failed (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  const authResult = data.AuthenticationResult;

  if (!authResult?.AccessToken) {
    throw new Error("Cognito returned no AccessToken — check credentials");
  }

  return {
    accessToken: authResult.AccessToken,
    idToken: authResult.IdToken || "",
    refreshToken: authResult.RefreshToken || "",
  };
}

/**
 * Register a new user in Cognito via the SignUp REST API.
 */
export async function cognitoRegister(
  email: string,
  password: string,
  name?: string,
): Promise<CognitoRegisterResult> {
  const config = getCognitoConfig();
  const endpoint = `https://cognito-idp.${config.region}.amazonaws.com/`;

  const userAttrs: Array<{ Name: string; Value: string }> = [
    { Name: "email", Value: email },
  ];
  if (name) {
    userAttrs.push({ Name: "name", Value: name });
  }

  const body = JSON.stringify({
    ClientId: config.clientId,
    Username: email,
    Password: password,
    UserAttributes: userAttrs,
  });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.SignUp",
    },
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err.message || err.__type || `Cognito SignUp failed (${res.status})`;
    throw new Error(message);
  }

  const data = await res.json();
  return {
    userSub: data.UserSub || "",
    userConfirmed: data.UserConfirmed ?? false,
  };
}

// ── Students (RDS) — called from loaders/actions ────────────

export interface Student {
  id: string;
  name: string;
  age: number;
  major: string;
}

export interface StudentInput {
  name: string;
  age: number;
  major: string;
}

export async function fetchStudents(request: Request): Promise<Student[]> {
  const backend = getBackendURL();
  const res = await fetch(`${backend}/students`, {
    headers: getAuthHeaders(request),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch students (${res.status})`);
  }
  return res.json();
}

export async function fetchStudent(
  id: string,
  request: Request,
): Promise<Student> {
  const backend = getBackendURL();
  const res = await fetch(`${backend}/students/${id}`, {
    headers: getAuthHeaders(request),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch student ${id} (${res.status})`);
  }
  return res.json();
}

export async function createStudent(
  data: StudentInput,
  request: Request,
): Promise<Student> {
  const backend = getBackendURL();
  const res = await fetch(`${backend}/students`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(request),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to create student (${res.status})`);
  }
  return res.json();
}

export async function updateStudent(
  id: string,
  data: StudentInput,
  request: Request,
): Promise<Student> {
  const backend = getBackendURL();
  const res = await fetch(`${backend}/students/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(request),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to update student ${id} (${res.status})`);
  }
  return res.json();
}

export async function deleteStudent(
  id: string,
  request: Request,
): Promise<void> {
  const backend = getBackendURL();
  const res = await fetch(`${backend}/students/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(request),
  });
  if (!res.ok) {
    throw new Error(`Failed to delete student ${id} (${res.status})`);
  }
}

// ── Notes (DocumentDB + KMS) — called from loaders/actions ──

export interface Note {
  id: string;
  student_id: string;
  content: string;
  created_at: string;
}

export async function fetchNotes(
  studentId: string,
  request: Request,
): Promise<Note[]> {
  const backend = getBackendURL();
  const res = await fetch(`${backend}/students/${studentId}/notes`, {
    headers: getAuthHeaders(request),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch notes (${res.status})`);
  }
  return res.json();
}

export async function createNote(
  studentId: string,
  content: string,
  request: Request,
): Promise<Note> {
  const backend = getBackendURL();
  const res = await fetch(`${backend}/students/${studentId}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(request),
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    throw new Error(`Failed to create note (${res.status})`);
  }
  return res.json();
}
