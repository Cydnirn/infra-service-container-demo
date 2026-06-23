import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { login, isAuthenticated } from "../api";
import { useState } from "react";

export async function clientLoader() {
  if (isAuthenticated()) {
    return redirect("/dashboard");
  }
  return null;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "Username and password are required" };
  }

  try {
    await login(username, password);
    return redirect("/dashboard");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Login failed" };
  }
}

export default function Login({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [error, setError] = useState(actionData?.error || "");

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Sign In</h2>
        <p className="login-description">
          Enter your credentials to access the Student Management System.
        </p>

        {error && <div className="login-error">{error}</div>}

        <Form method="post" className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              autoFocus
              disabled={isSubmitting}
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
      </div>
    </div>
  );
}
