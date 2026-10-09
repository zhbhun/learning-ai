import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const COURSE_LINK =
  /^\s*-\s+\[[^\]]+\]\((cheatsheets\/[a-z0-9]+(?:-[a-z0-9]+)*\/README\.mdx)\)\s*$/gm;
const STORY_FILE = /\.stories\.(?:js|jsx|mjs|ts|tsx)$/;

function resolveWorkspaceDir(workspaceDir) {
  if (workspaceDir instanceof URL) {
    return fileURLToPath(workspaceDir);
  }

  return path.resolve(workspaceDir);
}

function toStorybookPath(relativePath) {
  return `../${relativePath.split(path.sep).join('/')}`;
}

/**
 * @param {{ workspaceDir?: string | URL, fallback?: string[] }} [options]
 * @returns {string[]}
 */
export function roadmapStories({
  workspaceDir = new URL('..', import.meta.url),
  fallback = [],
} = {}) {
  const root = resolveWorkspaceDir(workspaceDir);
  const roadmapPath = path.join(root, 'ROADMAP.md');

  if (!existsSync(roadmapPath)) {
    return [...fallback];
  }

  const roadmap = readFileSync(roadmapPath, 'utf8');
  const stories = [];
  const seen = new Set();

  for (const match of roadmap.matchAll(COURSE_LINK)) {
    const readmePath = match[1];
    if (seen.has(readmePath)) {
      continue;
    }
    seen.add(readmePath);

    const absoluteReadmePath = path.join(root, readmePath);
    if (!existsSync(absoluteReadmePath)) {
      continue;
    }

    const courseDir = path.dirname(absoluteReadmePath);
    const relativeCourseDir = path.dirname(readmePath);
    const storyFiles = readdirSync(courseDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && STORY_FILE.test(entry.name))
      .map((entry) => path.join(relativeCourseDir, entry.name))
      .sort((left, right) => left.localeCompare(right));

    stories.push(...storyFiles.map(toStorybookPath));
    stories.push(toStorybookPath(readmePath));
  }

  return stories;
}
