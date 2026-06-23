import { redirect } from "react-router";
import type { Route } from "./+types/students.$id.delete";
import { deleteStudent } from "../api";

export async function action({ params, request }: Route.ActionArgs) {
  await deleteStudent(params.id, request);
  return redirect("/dashboard");
}
