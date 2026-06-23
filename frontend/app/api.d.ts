// Type declarations for api.js (SSR mode — all calls are server-side)

export function login(
  username: string,
  password: string,
): Promise<{ token: string; message: string }>;

export function fetchStudents(
  request: Request,
): Promise<Array<{ id: string; name: string; age: number; major: string }>>;

export function fetchStudent(
  id: string,
  request: Request,
): Promise<{ id: string; name: string; age: number; major: string }>;

export function createStudent(
  data: { name: string; age: number; major: string },
  request: Request,
): Promise<{ id: string; name: string; age: number; major: string }>;

export function updateStudent(
  id: string,
  data: { name: string; age: number; major: string },
  request: Request,
): Promise<{ id: string; name: string; age: number; major: string }>;

export function deleteStudent(id: string, request: Request): Promise<void>;

export function fetchNotes(
  studentId: string,
  request: Request,
): Promise<
  Array<{ id: string; student_id: string; content: string; created_at: string }>
>;

export function createNote(
  studentId: string,
  content: string,
  request: Request,
): Promise<{
  id: string;
  student_id: string;
  content: string;
  created_at: string;
}>;
