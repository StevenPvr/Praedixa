import { Composition } from "remotion";
import { DashboardPreview } from "./compositions/DashboardPreview";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DashboardPreview"
        component={DashboardPreview}
        durationInFrames={1350}
        fps={30}
        width={3840}
        height={2400}
      />
      <Composition
        id="DashboardPreview1920"
        component={DashboardPreview}
        durationInFrames={1350}
        fps={30}
        width={1920}
        height={1200}
      />
      <Composition
        id="DashboardPreview1280"
        component={DashboardPreview}
        durationInFrames={1350}
        fps={30}
        width={1280}
        height={800}
      />
    </>
  );
};
