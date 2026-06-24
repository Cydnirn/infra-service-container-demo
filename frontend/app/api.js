// All API calls happen server-side in SSR mode.
// The React Router server runs inside the EKS cluster and can reach
// the backend Service via Kubernetes DNS at http://student-backend:8080.
//
// Auth token (Cognito Access Token) is passed via cookies (HttpOnly)
// — never reaches the browser as JavaScript-accessible data.

const API_URL = (() => {
  if (typeof process !== "undefined" && process.env.API_URL) {
    return process.env.API_URL;
  }
  return "http://student-backend:8080";
})();

// ── Cookie helpers ────────────────────────────────────────

function getAuthToken(request) {
  const cookie = request?.headers?.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getAuthHeaders(request) {
  const token = getAuthToken(request);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

// ── Cognito Auth ───────────────────────────────────────────

/**
 * Authenticate with Amazon Cognito User Pool.
 * Returns the Cognito authentication result containing accessToken, idToken,
 * and refreshToken.
 */
export async function cognitoLogin(username, password) {
  const { CognitoUserPool, CognitoUser, AuthenticationDetails } =
    await import("amazon-cognito-identity-js");

  const poolData = {
    UserPoolId: getCognitoConfig().userPoolId,
    ClientId: getCognitoConfig().clientId,
  };

  const userPool = new CognitoUserPool(poolData);

  const authenticationDetails = new AuthenticationDetails({
    Username: username,
    Password: password,
  });

  const cognitoUser = new CognitoUser({
    Username: username,
    Pool: userPool,
  });

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        resolve({
          accessToken: result.getAccessToken().getJwtToken(),
          idToken: result.getIdToken().getJwtToken(),
          refreshToken: result.getRefreshToken().getToken(),
        });
      },
      onFailure: (err) => {
        reject(new Error(err.message || "Cognito authentication failed"));
      },
    });
  });
}

/**
 * Register a new user in the Cognito User Pool.
 */
export async function cognitoRegister(email, password, name) {
  const { CognitoUserPool, CognitoUserAttribute } =
    await import("amazon-cognito-identity-js");

  const poolData = {
    UserPoolId: getCognitoConfig().userPoolId,
    ClientId: getCognitoConfig().clientId,
  };

  const userPool = new CognitoUserPool(poolData);

  const attributeList = [
    new CognitoUserAttribute({ Name: "email", Value: email }),
  ];
  if (name) {
    attributeList.push(new CognitoUserAttribute({ Name: "name", Value: name }));
  }

  return new Promise((resolve, reject) => {
    userPool.signUp(email, password, attributeList, [], (err, result) => {
      if (err) {
        reject(new Error(err.message || "Cognito registration failed"));
        return;
      }
      resolve({
        userSub: result?.userSub,
        userConfirmed: result?.userConfirmed ?? false,
      });
    });
  });
}

function getCognitoConfig() {
  return {
    userPoolId:
      process.env.COGNITO_USER_POOL_ID || "REPLACE_WITH_COGNITO_USER_POOL_ID",
    clientId: process.env.COGNITO_CLIENT_ID || "REPLACE_WITH_COGNITO_CLIENT_ID",
  };
}

// ── Students (RDS) ──────────────────────────────────────────

export async function fetchStudents(request) {
  const res = await fetch(`${API_URL}/students`, {
    headers: getAuthHeaders(request),
  });
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
}

export async function fetchStudent(id, request) {
  const res = await fetch(`${API_URL}/students/${id}`, {
    headers: getAuthHeaders(request),
  });
  if (!res.ok) throw new Error("Failed to fetch student");
  return res.json();
}

export async function createStudent(data, request) {
  const res = await fetch(`${API_URL}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders(request) },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create student");
  return res.json();
}

export async function updateStudent(id, data, request) {
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAuthHeaders(request) },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update student");
  return res.json();
}

export async function deleteStudent(id, request) {
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(request),
  });
  if (!res.ok) throw new Error("Failed to delete student");
}

// ── Notes (DocumentDB + KMS encrypted) ──────────────────────

export async function fetchNotes(studentId, request) {
  const res = await fetch(`${API_URL}/students/${studentId}/notes`, {
    headers: getAuthHeaders(request),
  });
  if (!res.ok) throw new Error("Failed to fetch notes");
  return res.json();
}

export async function createNote(studentId, content, request) {
  const res = await fetch(`${API_URL}/students/${studentId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders(request) },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to create note");
  return res.json();
}
