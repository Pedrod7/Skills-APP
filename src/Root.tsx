import { Composition } from "remotion";
import { BridgeShort } from "./bridge/Bridge";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="BridgeVideo"
        component={BridgeShort}
        durationInFrames={1980}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
