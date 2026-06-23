import {
  type RouteConfig,
  index,
  route,
} from "@react-router/dev/routes";

export default [
  index("./routes/index.tsx"),
  route("students/new", "./routes/students.new.tsx"),
  route("students/:id/edit", "./routes/students.$id.edit.tsx"),
  route("students/:id/delete", "./routes/students.$id.delete.tsx"),
] satisfies RouteConfig;
