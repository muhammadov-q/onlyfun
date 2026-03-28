// Study Timer — Pomodoro timer component

export function TimerBoard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
      <div className="text-6xl">⏱️</div>
      <h2 className="text-2xl font-black text-gray-900">Study Timer</h2>
      <p className="text-gray-500 max-w-sm">
        Focus sessions with Pomodoro technique. Beat procrastination one tomato at a time.
      </p>
    </div>
  );
}
