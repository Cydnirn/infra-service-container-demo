import { redirect } from "react-router";
import type { Route } from "./+types/students.$id.delete";
import { deleteStudent } from "../api";

export async function clientAction({ params }: Route.ClientActionArgs) {
  await deleteStudent(params.id);
  return redirect("/");
}
