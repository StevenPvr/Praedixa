import { Composition } from "remotion";
import { DashboardPreview } from "./compositions/DashboardPreview";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DashboardPreview"
      component={DashboardPreview}
      durationInFrames={1350}
      fps={30}
      width={3840}
      height={2400}
    />
  );
};
