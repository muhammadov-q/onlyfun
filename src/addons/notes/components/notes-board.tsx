// Note Ninja — main board component

export function NotesBoard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4">
      <div className="text-6xl">📄</div>
      <h2 className="text-2xl font-black text-gray-900">Note Ninja</h2>
      <p className="text-gray-500 max-w-sm">
        Take smart notes, organize by subject, and never lose an idea again.
        Full experience coming soon!
      </p>
    </div>
  );
}
