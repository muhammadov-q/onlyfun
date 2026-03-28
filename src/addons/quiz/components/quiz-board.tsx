// Quiz Master — main board component
// This is where the quiz addon UI lives

export function QuizBoard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
      <div className="text-6xl">🧠</div>
      <h2 className="text-2xl font-black text-gray-900">Quiz Master</h2>
      <p className="text-gray-500 max-w-sm">
        Create quizzes, challenge your classmates, and track your scores.
        Full experience coming soon!
      </p>
    </div>
  );
}
