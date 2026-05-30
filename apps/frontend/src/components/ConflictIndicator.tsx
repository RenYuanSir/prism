interface ConflictIndicatorProps {
  visible: boolean;
  conflictPoint: string;
}

export function ConflictIndicator({ visible, conflictPoint }: ConflictIndicatorProps) {
  if (!visible) return null;

  return (
    <div className="flex items-center justify-center my-4">
      <div className="flex-1 border-t-2 border-dashed border-red-500/50" />
      <div className="mx-4 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg">
        <p className="text-xs font-bold text-red-400 text-center">CONFLICT</p>
        <p className="text-xs text-linear-text-secondary text-center mt-1">{conflictPoint}</p>
      </div>
      <div className="flex-1 border-t-2 border-dashed border-red-500/50" />
    </div>
  );
}
