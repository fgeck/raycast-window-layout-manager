import fs from "fs";
import path from "path";
import os from "os";

// Path for storing layouts
export const layoutsPath = path.join(os.homedir(), '.raycast-layouts.json');
// Define types
export interface WindowLayout {
    appName: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
}

export interface Layout {
    name: string;
    windows: WindowLayout[];
}

// Function to load saved layouts
export function loadLayouts(): Layout[] {
    try {
        if (fs.existsSync(layoutsPath)) {
            return JSON.parse(fs.readFileSync(layoutsPath, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading layouts:', error);
    }
    return [];
}

// Function to save layouts
export function saveLayouts(layouts: Layout[]) {
    try {
        fs.writeFileSync(layoutsPath, JSON.stringify(layouts, null, 2));
    } catch (error) {
        console.error('Error saving layouts:', error);
    }
}