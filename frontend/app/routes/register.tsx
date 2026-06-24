import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/register";
import { cognitoRegister } from "../api";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    await cognitoRegister(email, password, name || undefined);
    // After successful registration, redirect to login with a success message.
    return redirect("/", {
      headers: {
        // We can't easily pass flash messages in SSR, so we redirect
        // and the user signs in.
      },
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Registration failed",
    };
  }
}

export default function Register({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Create Account</h2>
        <p className="login-description">
          Sign up for a new account to access the Student Management System.
        </p>

        {actionData?.error && (
          <div className="login-error">{actionData.error}</div>
        )}

        <Form method="post" className="login-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              disabled={isSubmitting}
              placeholder="John Doe"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
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
              minLength={8}
              disabled={isSubmitting}
              placeholder="Min. 8 characters"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Account..." : "Sign Up"}
          </button>
        </Form>

        <p className="login-footer">
          Already have an account?{" "}
          <a href="/" className="login-link">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
