export function OwnerSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return <div className={`owner-skeleton ${className}`} aria-hidden />;
}

export function OwnerCardSkeleton() {
  return (
    <div className="owner-card space-y-3 p-5" aria-hidden>
      <OwnerSkeleton className="h-5 w-2/3" />
      <OwnerSkeleton className="h-4 w-1/2" />
      <div className="grid grid-cols-2 gap-3 pt-2">
        <OwnerSkeleton className="h-10 w-full" />
        <OwnerSkeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
