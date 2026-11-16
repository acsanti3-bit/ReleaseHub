export interface ClientVersion {
  id: number;

  importId: number;

  fantasyName: string;

  document: string;

  state: string;

  partner: string;

  version: string;

  activeLicenses: number;
}


export interface ClientVersionImport {
  id: number;

  fileName: string;

  totalRows: number;

  totalActiveLicenses: number;

  importedAt: string;
}


export interface ClientVersionsResponse {
  clients: ClientVersion[];

  lastImport: ClientVersionImport | null;
}


export interface ClientVersionImportRow {
  fantasyName: string;

  document: string;

  state: string;

  partner: string;

  version: string;

  activeLicenses: number;
}