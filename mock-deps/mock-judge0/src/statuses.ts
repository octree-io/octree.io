// Judge0 submission status ids. 1 (In Queue) and 2 (Processing) are the only
// non-terminal states; everything else is a final verdict.
// https://ce.judge0.com/#statuses-and-languages-status
export interface Status {
  id: number;
  description: string;
}

export const STATUS = {
  IN_QUEUE: { id: 1, description: "In Queue" },
  PROCESSING: { id: 2, description: "Processing" },
  ACCEPTED: { id: 3, description: "Accepted" },
  WRONG_ANSWER: { id: 4, description: "Wrong Answer" },
  TIME_LIMIT_EXCEEDED: { id: 5, description: "Time Limit Exceeded" },
  COMPILATION_ERROR: { id: 6, description: "Compilation Error" },
  RUNTIME_ERROR_SIGSEGV: { id: 11, description: "Runtime Error (SIGSEGV)" },
  INTERNAL_ERROR: { id: 13, description: "Internal Error" },
} as const satisfies Record<string, Status>;

export const ALL_STATUSES: Status[] = [
  STATUS.IN_QUEUE,
  STATUS.PROCESSING,
  STATUS.ACCEPTED,
  STATUS.WRONG_ANSWER,
  STATUS.TIME_LIMIT_EXCEEDED,
  STATUS.COMPILATION_ERROR,
  { id: 7, description: "Runtime Error (SIGXFSZ)" },
  { id: 8, description: "Runtime Error (SIGFPE)" },
  { id: 9, description: "Runtime Error (SIGABRT)" },
  { id: 10, description: "Runtime Error (NZEC)" },
  STATUS.RUNTIME_ERROR_SIGSEGV,
  { id: 12, description: "Runtime Error (Other)" },
  STATUS.INTERNAL_ERROR,
  { id: 14, description: "Exec Format Error" },
];

// The subset of languages octree submits (see judge0 memory + worker). Enough
// for GET /languages to look real; the mock never actually compiles anything.
export const LANGUAGES = [
  { id: 54, name: "C++ (GCC 9.2.0)" },
  { id: 62, name: "Java (OpenJDK 13.0.1)" },
  { id: 63, name: "JavaScript (Node.js 12.14.0)" },
  { id: 71, name: "Python (3.8.1)" },
  { id: 74, name: "TypeScript (3.7.4)" },
];
