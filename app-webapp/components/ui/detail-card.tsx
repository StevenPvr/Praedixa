import * as React from "react";
import { cn } from "@praedixa/ui";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export interface DetailCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  padding?: "none" | "compact" | "default" | "loose";
  action?: React.ReactNode;
}

const DetailCard = React.forwardRef<HTMLDivElement, DetailCardProps>(
  (
    { className, title, padding = "default", action, children, ...props },
    ref,
  ) => {
    const isLoose = padding === "loose";
    const isCompact = padding === "compact";
    const isNone = padding === "none";

    return (
      <Card
        ref={ref}
        className={cn(
          "h-full flex flex-col",
          isLoose && "p-8",
          isCompact && "p-4",
          isNone && "p-0",
          className,
        )}
        variant="default"
        {...props}
      >
        {title && (
          <CardHeader
            className={cn(
              "flex-row items-center justify-between space-y-0 pb-6",
              isNone && "px-6 pt-6",
            )}
          >
            <CardTitle>{title}</CardTitle>
            {action && <div>{action}</div>}
          </CardHeader>
        )}
        <CardContent
          className={cn("flex-1", isNone && "p-0", title && !isNone && "pt-0")}
        >
          {children}
        </CardContent>
      </Card>
    );
  },
);

DetailCard.displayName = "DetailCard";

export { DetailCard };
