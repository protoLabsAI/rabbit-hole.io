import { CopilotKit } from "@copilotkit/react-core";
import dynamic from "next/dynamic";

const DeepAgentPlaygroundComponent = dynamic(
  () =>
    import("./DeepAgentPlayground").then((mod) => ({
      default: mod.DeepAgentPlayground,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">
            Loading Deep Agent Playground...
          </div>
          <div className="text-sm text-muted-foreground">
            Initializing chat interface and force graph visualization
          </div>
        </div>
      </div>
    ),
  }
);

export function DeepAgentPlayground() {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="research_agent"
      publicLicenseKey="ck_pub_5d425f60d199031698f99a979d267a19"
    >
      <DeepAgentPlaygroundComponent />
    </CopilotKit>
  );
}
