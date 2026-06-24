import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { cognitoLogin } from "../api";

export async function loader() {
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Username and password are required" };
  }

  try {
    const data = await cognitoLogin(username, password);
    // Store the Cognito Access Token in an HttpOnly cookie.
    // SSR loaders read it from the request Cookie header.
    // Client-side fetch sends it automatically via credentials: "include".
    // Backend middleware reads it from Authorization header OR cookie.
    return redirect("/dashboard", {
      headers: {
        "Set-Cookie": `auth_token=${data.accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
      },
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Authentication failed",
    };
  }
}

export default function Login({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Sign In</h2>
        <p className="login-description">
          Sign in with your Cognito credentials to access the Student Management
          System.
        </p>

        {actionData?.error && (
          <div className="login-error">{actionData.error}</div>
        )}

        <Form method="post" className="login-form">
          <div className="form-group">
            <label htmlFor="username">Email</label>
            <input
              type="email"
              id="username"
              name="username"
              required
              autoFocus
              disabled={isSubmitting}
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </Form>

        <p className="login-footer">
          Don't have an account?{" "}
          <a href="/register" className="login-link">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
