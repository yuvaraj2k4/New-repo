import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/60 animate-in fade-in duration-200">
      <LoadingSpinner size="lg" color="#3a57e8" />
    </div>
  );
}
