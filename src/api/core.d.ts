/** How the dummy API's stand-in network behaves. */
export interface ApiSettings {
  /** Delay of every read, in ms. */
  readMs: number;
  /** Delay of every write, in ms. */
  writeMs: number;
  /** Share of writes, 0 to 1, that fail before changing anything. */
  failureRate: number;
}

/** Settings from ?api-latency=none|fast|slow and ?api-failures=<0 to 1>; unknown values are ignored. */
export function settingsFromQuery(search: string): Partial<ApiSettings>;

/** Change the settings; returns those now in force. */
export function configureApi(patch?: Partial<ApiSettings>): ApiSettings;
