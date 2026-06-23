export function getAuthToken(): string | null;
export function setAuthToken(token: string): void;
export function clearAuthToken(): void;
export function isAuthenticated(): boolean;
export function login(
  username: string,
  password: string,
): Promise<{ token: string; message: string }>;
export function logout(): Promise<void>;
export function fetchStudents(): Promise<
  Array<{ id: string; name: string; age: number; major: string }>
>;
export function fetchStudent(
  id: string,
): Promise<{ id: string; name: string; age: number; major: string }>;
export function createStudent(data: {
  name: string;
  age: number;
  major: string;
}): Promise<{ id: string; name: string; age: number; major: string }>;
export function updateStudent(
  id: string,
  data: { name: string; age: number; major: string },
): Promise<{ id: string; name: string; age: number; major: string }>;
export function deleteStudent(id: string): Promise<void>;
export function fetchNotes(
  studentId: string,
): Promise<
  Array<{ id: string; student_id: string; content: string; created_at: string }>
>;
export function createNote(
  studentId: string,
  content: string,
): Promise<{
  id: string;
  student_id: string;
  content: string;
  created_at: string;
}>;
