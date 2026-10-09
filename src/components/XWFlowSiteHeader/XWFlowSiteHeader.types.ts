export interface SiteHeaderLink {
  id: string;
  label: string;
  href: string;
}

export interface XWFlowSiteHeaderData {
  wordmark: string;
  links: SiteHeaderLink[];
  languageLabel: string;
  signInLabel: string;
  startLabel: string;
  onLanguage: () => void;
  onSignIn: () => void;
  onStart: () => void;
}
