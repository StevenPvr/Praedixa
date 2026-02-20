import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AppHeader } from "../components/AppHeader";
import { MouseActor, type MouseKeyframe } from "../components/MouseActor";
import { Sidebar } from "../components/Sidebar";
import { WarRoomView } from "../components/WarRoomView";
import { ActionsHistoriqueView } from "../components/views/ActionsHistoriqueView";
import { ActionsTraitementView } from "../components/views/ActionsTraitementView";
import { DonneesDatasetsView } from "../components/views/DonneesDatasetsView";
import { ParametresView } from "../components/views/ParametresView";
import { PrevisionsAlertsView } from "../components/views/PrevisionsAlertsView";
import { colors, fonts, layout } from "../tokens";
import { CLICK_TARGETS } from "./click-targets";
import {
  CURSOR_STEPS,
  JOURNEY_VIEWS,
  OUTRO_START,
  SHELL_INTRO_END,
  VIDEO_DURATION_FRAMES,
  getNavStateAtFrame,
  getViewAtFrame,
} from "./daily-journey-script";

const cursorKeyframes: MouseKeyframe[] = CURSOR_STEPS.map((step) => ({
  frame: step.frame,
  x: CLICK_TARGETS[step.target].x,
  y: CLICK_TARGETS[step.target].y,
  action: step.action,
}));

function SceneView({
  sceneId,
}: {
  sceneId: (typeof JOURNEY_VIEWS)[number]["id"];
}) {
  switch (sceneId) {
    case "dashboard":
      return <WarRoomView />;
    case "previsions-alertes":
      return <PrevisionsAlertsView />;
    case "actions-traitement":
      return <ActionsTraitementView />;
    case "actions-historique":
      return <ActionsHistoriqueView />;
    case "donnees-datasets":
      return <DonneesDatasetsView />;
    case "parametres":
      return <ParametresView />;
    default:
      return null;
  }
}

/**
 * 45s walkthrough:
 * Dashboard -> Previsions -> Actions -> Historique -> Donnees -> Parametres
 * with mouse interactions and submenu clicks.
 */
export const DashboardPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const scale = Math.min(
    width / layout.logicalWidth,
    height / layout.logicalHeight,
  );

  const shellOpacity = interpolate(frame, [0, 24], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [OUTRO_START, VIDEO_DURATION_FRAMES],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const timelineFrame = Math.max(frame, SHELL_INTRO_END);
  const currentView = getViewAtFrame(timelineFrame);
  const currentNav = getNavStateAtFrame(timelineFrame);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.pageBg,
        fontFamily: fonts.sans,
        opacity: shellOpacity * fadeOut,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: layout.logicalWidth,
          height: layout.logicalHeight,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: layout.sidebarWidth,
          }}
        >
          <Sidebar
            frame={frame}
            activeItemId={currentNav.activeItemId}
            activeChildId={currentNav.activeChildId}
            expandedItemIds={currentNav.expandedItemIds}
          />
        </div>

        <div
          style={{
            position: "absolute",
            left: layout.sidebarWidth,
            top: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <div
            style={{ height: layout.topbarHeight + layout.contextBarHeight }}
          >
            <AppHeader
              frame={frame}
              breadcrumbs={currentView.breadcrumbs}
              dateLabel={currentView.dateLabel}
              updatedAtLabel={currentView.updatedAtLabel}
            />
          </div>

          <div
            style={{
              position: "relative",
              height: `calc(100% - ${layout.topbarHeight + layout.contextBarHeight}px)`,
              overflow: "hidden",
            }}
          >
            {JOURNEY_VIEWS.map((scene) => {
              return (
                <Sequence
                  key={scene.id}
                  from={scene.start}
                  durationInFrames={scene.end - scene.start}
                  layout="none"
                >
                  <SceneView sceneId={scene.id} />
                </Sequence>
              );
            })}
          </div>
        </div>

        <MouseActor
          keyframes={cursorKeyframes}
          visibleFrom={SHELL_INTRO_END + 10}
          visibleTo={OUTRO_START + 20}
        />
      </div>
    </AbsoluteFill>
  );
};
