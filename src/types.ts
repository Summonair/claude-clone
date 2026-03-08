export interface Repo {
  name: string;
  description: string;
  url: string;  // clone URL
  sshUrl: string;
}

export interface Preset {
  org?: string;
  repos: string[];
}

export interface Config {
  defaultOrg?: string;
  workspaceDir: string;  // default: ~/giterepos/claude-tasks
  presets: Record<string, Preset>;
}
