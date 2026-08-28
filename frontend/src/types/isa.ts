export interface IsaApplication {
  id: number;
  name: string;
  display_order: number;
  active: number;
  version: string;
  updated_at?: string | null;
}


export interface IsaEnvironmentData {
  environmentId: number;

  applications:
    IsaApplication[];
}


export interface UpdateIsaVersionResponse {
  sucesso: boolean;

  application: {
    id: number;
    name: string;
    version: string;
    previousVersion: string;
  };
}
