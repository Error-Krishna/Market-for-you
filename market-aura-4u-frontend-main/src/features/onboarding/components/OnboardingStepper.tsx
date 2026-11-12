import { cn } from "@/lib/utils/cn";

interface OnboardingStepperProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingStepper({ currentStep, totalSteps }: OnboardingStepperProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const index = i + 1;
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        return (
          <div
            key={i}
            className={cn(
              "step-dot",
              isActive && "active",
              isCompleted && "completed",
              !isActive && !isCompleted && "inactive",
            )}
          />
        );
      })}
    </div>
  );
}
