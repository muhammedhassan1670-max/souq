import { RefreshCcw } from 'lucide-react';

export function LoadingGrid({ items = 4 }: { items?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 sm:px-0 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border border-sand bg-white shadow-card">
          <div className="aspect-square animate-pulse bg-sand/60" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-sand/70" />
            <div className="h-6 w-1/2 animate-pulse rounded bg-sand/70" />
            <div className="h-11 animate-pulse rounded-xl bg-sand/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function InlineError({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="mx-4 rounded-xl border border-error/20 bg-error/10 p-4 text-center sm:mx-auto sm:max-w-7xl">
      <p className="text-sm font-black text-error">{message || 'حصلت مشكلة في تحميل البيانات'}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mx-auto mt-3 flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-error"
        >
          <RefreshCcw className="h-4 w-4" />
          حاول تاني
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="px-4 py-12 text-center">
      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-cream-warm" />
      <h3 className="text-lg font-black text-charcoal">{title}</h3>
      {description && <p className="mt-1 text-sm font-semibold text-charcoal-muted">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mx-auto mt-4 h-12 rounded-xl bg-olive px-5 text-sm font-black text-white shadow-button"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
