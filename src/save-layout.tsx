import { List, ActionPanel, Action, useNavigation, showHUD, Form, Icon, Color } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import fs from "fs";
import path from "path";
import os from "os";
import { useState, useEffect } from "react";

// Types
interface WindowLayout {
  appName: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

interface Layout {
  name: string;
  windows: WindowLayout[];
}

// Storage path
const LAYOUTS_PATH = path.join(os.homedir(), '.raycast-layouts.json');

// Load layouts
function loadLayouts(): Layout[] {
  try {
    if (fs.existsSync(LAYOUTS_PATH)) {
      return JSON.parse(fs.readFileSync(LAYOUTS_PATH, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading layouts:', error);
  }
  return [];
}

// Save layouts
function saveLayouts(layouts: Layout[]) {
  try {
    fs.writeFileSync(LAYOUTS_PATH, JSON.stringify(layouts, null, 2));
  } catch (error) {
    console.error('Error saving layouts:', error);
  }
}

// Get running apps
async function getRunningApps(): Promise<string[]> {
  const script = `
    tell application "System Events"
      set appList to name of every application process where background only is false
      return appList
    end tell
  `;
  const result = await runAppleScript(script);
  return result.split(", ");
}

// Get window info for an app
async function getWindowInfo(appName: string): Promise<WindowLayout | null> {
  const script = `
    tell application "System Events"
      tell process "${appName}"
        if exists window 1 then
          set pos to position of window 1
          set sz to size of window 1
          return {item 1 of pos, item 2 of pos, item 1 of sz, item 2 of sz}
        end if
      end tell
    end tell
  `;
  try {
    const result = await runAppleScript(script);
    const [x, y, width, height] = result.split(", ").map(Number);
    return {
      appName,
      position: { x, y },
      size: { width, height }
    };
  } catch {
    return null;
  }
}

// Apply layout
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

// App Selection View
function AppSelectionView({ onSave }: { onSave: (name: string, apps: string[]) => void }) {
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [runningApps, setRunningApps] = useState<string[]>([]);
  const [layoutName, setLayoutName] = useState("");
  const { pop } = useNavigation();

  useEffect(() => {
    getRunningApps().then(setRunningApps);
  }, []);

  const validLayoutName = layoutName.trim().length > 0;

  const handleSave = async () => {
    if (validLayoutName && selectedApps.length > 0) {
      await onSave(layoutName, selectedApps);
      await showHUD(`Layout "${layoutName}" saved with ${selectedApps.length} apps`);
      pop();
    }
  };

  return (
    <List
      searchBarPlaceholder="Enter Layout Name..."
      navigationTitle="Create New Layout"
      searchText={layoutName}
      onSearchTextChange={setLayoutName}
      throttle
      actions={
        <ActionPanel>
          {validLayoutName && selectedApps.length > 0 && (
            <Action
              title="Save Layout"
              icon={Icon.SaveDocument}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={handleSave}
            />
          )}
        </ActionPanel>
      }
    >
      <List.Section title="Layout Name">
        <List.Item
          title={layoutName || "Enter Layout Name"}
          icon={validLayoutName ? Icon.CheckCircle : Icon.Circle}
          accessories={[
            {
              text: selectedApps.length > 0 ? `${selectedApps.length} apps selected` : "Select apps below"
            }
          ]}
          actions={
            <ActionPanel>
              {validLayoutName && selectedApps.length > 0 && (
                <Action
                  title="Save Layout"
                  icon={Icon.SaveDocument}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                  onAction={handleSave}
                />
              )}
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Available Applications" subtitle={`${selectedApps.length} selected`}>
        {runningApps.map((app) => {
          const isSelected = selectedApps.includes(app);
          return (
            <List.Item
              key={app}
              title={app}
              icon={isSelected ? Icon.CircleFilled : Icon.Circle}
              accessories={[
                {
                  icon: isSelected ? { source: Icon.CheckCircle, tintColor: Color.Green } : undefined,
                  text: isSelected ? "Selected" : undefined
                }
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={isSelected ? "Deselect" : "Select"}
                    icon={isSelected ? Icon.XmarkCircle : Icon.CheckCircle}
                    onAction={() => {
                      setSelectedApps(
                        isSelected
                          ? selectedApps.filter((a) => a !== app)
                          : [...selectedApps, app]
                      );
                    }}
                  />
                  {validLayoutName && selectedApps.length > 0 && (
                    <Action
                      title="Save Layout"
                      icon={Icon.SaveDocument}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={handleSave}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

// Main command
export default function Command() {
  const { push } = useNavigation();
  const [layouts, setLayouts] = useState<Layout[]>(loadLayouts());

  const handleCreateLayout = async (name: string, selectedApps: string[]) => {
    const windowLayouts: WindowLayout[] = [];
    
    for (const app of selectedApps) {
      const info = await getWindowInfo(app);
      if (info) {
        windowLayouts.push(info);
      }
    }

    const newLayout = {
      name,
      windows: windowLayouts
    };

    const updatedLayouts = [...layouts, newLayout];
    setLayouts(updatedLayouts);
    saveLayouts(updatedLayouts);
  };

  return (
    <List navigationTitle="App Layouts">
      <List.Item
        title="Create New Layout"
        icon={Icon.PlusCircle}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Layout"
              icon={Icon.PlusCircle}
              target={<AppSelectionView onSave={handleCreateLayout} />}
            />
          </ActionPanel>
        }
      />
      {layouts.map((layout) => (
        <List.Item
          key={layout.name}
          title={layout.name}
          icon={Icon.Window}
          subtitle={`${layout.windows.length} windows`}
          accessories={[{ icon: Icon.ChevronRight }]}
          actions={
            <ActionPanel>
              <Action
                title="Apply Layout"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  await applyLayout(layout);
                  await showHUD(`Layout "${layout.name}" applied`);
                }}
              />
              <Action
                title="Delete Layout"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const updatedLayouts = layouts.filter((l) => l.name !== layout.name);
                  setLayouts(updatedLayouts);
                  saveLayouts(updatedLayouts);
                  await showHUD(`Layout "${layout.name}" deleted`);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
