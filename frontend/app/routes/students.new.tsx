import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/students.new";
import { createStudent } from "../api";

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const student = {
    name: formData.get("name"),
    age: parseInt(formData.get("age"), 10),
    major: formData.get("major"),
  };
  await createStudent(student);
  return redirect("/");
}

export default function NewStudent() {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="student-form-container">
      <h2>Add New Student</h2>

      <Form method="post" className="student-form">
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="age">Age</label>
          <input
            type="number"
            id="age"
            name="age"
            min="1"
            max="120"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="major">Major</label>
          <input
            type="text"
            id="major"
            name="major"
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Student"}
          </button>
          <a href="/" className="btn btn-secondary">
            Cancel
          </a>
        </div>
      </Form>
    </div>
  );
}
