import { cn } from "@/lib/utils";

interface LoaderProps {
  className?: string;
}

export const Loader = ({ className }: LoaderProps) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="loader">
        <div className="loader-dot" />
      </div>
    </div>
  );
};
