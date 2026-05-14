import { cn } from '@/lib/utils';

const markSizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-14 w-14',
  xl: 'h-20 w-20',
};

const textSizeClasses = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

type BrandLogoProps = {
  size?: keyof typeof markSizeClasses;
  showText?: boolean;
  showTagline?: boolean;
  stacked?: boolean;
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  taglineClassName?: string;
};

export default function BrandLogo({
  size = 'md',
  showText = true,
  showTagline = false,
  stacked = false,
  className,
  imageClassName,
  textClassName,
  taglineClassName,
}: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', stacked && 'flex-col text-center', className)}>
      <img
        src="/images/brand/logo-mark.png"
        alt="سوق البلد"
        width={size === 'xl' ? 80 : size === 'lg' ? 56 : size === 'md' ? 48 : 36}
        height={size === 'xl' ? 80 : size === 'lg' ? 56 : size === 'md' ? 48 : 36}
        className={cn('flex-shrink-0 rounded-2xl object-contain shadow-xs', markSizeClasses[size], imageClassName)}
      />
      {showText && (
        <div className={cn('min-w-0 leading-tight', stacked && 'mt-1')}>
          <p className={cn('font-black text-olive-dark', textSizeClasses[size], textClassName)}>سوق البلد</p>
          {showTagline && (
            <p className={cn('mt-0.5 text-xs font-bold text-clay-dark sm:text-sm', taglineClassName)}>
              كل طلبات بيتك لحد بابك
            </p>
          )}
        </div>
      )}
    </div>
  );
}
