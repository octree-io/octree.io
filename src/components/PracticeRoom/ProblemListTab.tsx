import { useEffect, useState } from "react";
import { blind75 } from "../../config/constants";

const STORAGE_KEY = "problemProgress";

const problemsByPattern = blind75.reduce((acc, problem) => {
  if (!acc[problem.pattern]) acc[problem.pattern] = [];
  acc[problem.pattern].push(problem);
  return acc;
}, {} as Record<string, typeof blind75>);

const ProblemListTab = ({ onProblemClick }: { onProblemClick: (slug: string) => void }) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, boolean>>({});

  const toggleGroup = (pattern: string) => {
    setOpenGroups(prev => ({ ...prev, [pattern]: !prev[pattern] }));
  };

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setProgress(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  return (
    <div className="space-y-4">
      {Object.entries(problemsByPattern).map(([pattern, subproblems]) => (
        <div key={pattern} className="border rounded">
          {/* Group Header */}
          <button
            onClick={() => toggleGroup(pattern)}
            className="w-full flex justify-between items-center px-4 py-2 font-semibold text-left text-white bg-[#9266cc] hover:bg-purple-200 dark:bg-[#9266cc] dark:hover:bg-purple-800 transition cursor-pointer"
          >
            <span>{pattern}</span>
            <span>{openGroups[pattern] ? "−" : "+"}</span>
          </button>

          {/* Problem Items */}
          {openGroups[pattern] && (
            <ul className="divide-y">
              {subproblems.map(problem => (
                <li
                  key={problem.slug}
                  className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-[#b786f7] hover:text-white transition"
                >
                  <div className="flex items-center justify-between">
                    {/* Left: Checkbox + clickable name */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="cursor-pointer"
                        checked={progress[problem.slug] || false}
                        onChange={(e) =>
                          setProgress((prev) => ({
                            ...prev,
                            [problem.slug]: e.target.checked,
                          }))
                        }
                        title="Mark as complete"
                      />

                      <span
                        onClick={() => onProblemClick(problem.slug)}
                        className="cursor-pointer hover:underline"
                      >
                        {problem.problem}
                      </span>
                    </div>

                    {/* Right: Difficulty badge */}
                    <span
                      className={`text-sm font-medium rounded-full px-2 py-0.5 ${
                        problem.difficulty === "Easy"
                          ? "bg-green-200 text-green-800"
                          : problem.difficulty === "Medium"
                          ? "bg-yellow-200 text-yellow-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {problem.difficulty}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

export default ProblemListTab;
