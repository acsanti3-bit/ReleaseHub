export type CompatibilityItemSource =
  | "environment"
  | "redmine"
  | "manual";

export type CompatibilityVersionSource =
  | "environment"
  | "redmine"
  | "manual";

export interface CompatibilitySystemDefinition {
  key: string;
  source: CompatibilityItemSource;
  originalName?: string;
  displayName: string;
  redmineProjectId?: number | null;
  redmineProjectName?: string;
  defaultVisible: boolean;
  order: number;
  relatedTo: string[];
}

export interface CompatibilitySystemCatalog {
  items: CompatibilitySystemDefinition[];
}

export interface CompatibilityItem {
  key: string;
  source: CompatibilityItemSource;
  originalName?: string;
  displayName: string;
  environmentVersion?: string;
  selectedVersion: string;
  versionSource: CompatibilityVersionSource;
  redmineProjectId?: number | null;
  redmineProjectName?: string;
  visible: boolean;
  order: number;
  relatedTo: string[];
}

export interface EnvironmentCompatibility {
  environmentId: number;
  environmentName: string;
  configured: boolean;
  items: CompatibilityItem[];
  manualVersions: Record<string, string[]>;
}

export interface RedmineProjectOption {
  id: number;
  name: string;
  identifier: string;
  status?: number;
}

export interface RedmineVersionOption {
  id: number;
  name: string;
  status?: string;
}
