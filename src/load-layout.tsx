import fs from "fs"

import { Action, ActionPanel, List, showHUD, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { Layout, layoutsPath, saveLayouts } from "./consts";

// Function to load saved layouts
function loadLayouts(): Layout[] {
  try {
    if (fs.existsSync(layoutsPath)) {
      return JSON.parse(fs.readFileSync(layoutsPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading layouts:', error);
  }
  return [];
}

// Function to apply a layout
async function applyLayout(layout: Layout) {
  for (const window of layout.windows) {
    const script = `
      tell application "System Events"
        tell application "${window.appName}"
          activate
        end tell
        tell process "${window.appName}"
          set position of window 1 to {${window.position.x}, ${window.position.y}}
          set size of window 1 to {${window.size.width}, ${window.size.height}}
        end tell
      end tell
    `;
    await runAppleScript(script);
  }
}

// Main command
export default function Command() {
  const layouts = loadLayouts();

  return (
    <List>
      {layouts.map((layout) => (
        <List.Item
          key={layout.name}
          title={layout.name}
          subtitle={`${layout.windows.length} windows`}
          actions={
            <ActionPanel>
              <Action
                title="Apply Layout"
                onAction={async () => {
                  await applyLayout(layout);
                  await showHUD("Layout applied ✓");
                  await showToast({ title: "✓", message: "Layout applied" });
                }}
              />
              <Action
                title="Delete Layout"
                onAction={async () => {
                  const updatedLayouts = layouts.filter((l) => l.name !== layout.name);
                  saveLayouts(updatedLayouts);
                  await showHUD("Layout deleted ✓");
                  await showToast({ title: "✓", message: "Layout deleted" });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}