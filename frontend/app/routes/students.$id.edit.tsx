import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/students.$id.edit";
import { fetchStudent, updateStudent } from "../api";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const student = await fetchStudent(params.id);
  return { student };
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const student = {
    name: formData.get("name"),
    age: parseInt(formData.get("age"), 10),
    major: formData.get("major"),
  };
  await updateStudent(params.id, student);
  return redirect("/");
}

export default function EditStudent({ loaderData }: Route.ComponentProps) {
  const { student } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="student-form-container">
      <h2>Edit Student</h2>

      <Form method="post" className="student-form">
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            defaultValue={student.name}
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
            defaultValue={student.age}
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
            defaultValue={student.major}
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
            {isSubmitting ? "Saving..." : "Update Student"}
          </button>
          <a href="/" className="btn btn-secondary">
            Cancel
          </a>
        </div>
      </Form>
    </div>
  );
}
