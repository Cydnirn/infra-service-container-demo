import { Form, redirect, useNavigation } from "react-router";
import type { Route } from "./+types/students.$id.edit";
import { fetchStudent, updateStudent } from "../api";

export async function loader({ params, request }: Route.LoaderArgs) {
  try {
    const student = await fetchStudent(params.id, request);
    return { student };
  } catch {
    return redirect("/");
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const student = {
    name: formData.get("name") as string,
    age: parseInt(formData.get("age") as string, 10),
    major: formData.get("major") as string,
  };
  await updateStudent(params.id, student, request);
  return redirect("/dashboard");
}

export default function EditStudent({ loaderData }: Route.ComponentProps) {
  const student = loaderData?.student ?? {
    id: "",
    name: "",
    age: 0,
    major: "",
  };
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
          <a href="/dashboard" className="btn btn-secondary">
            Cancel
          </a>
        </div>
      </Form>
    </div>
  );
}
