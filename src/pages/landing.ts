import { catalog } from "../content/catalog";
import { XWFlowComposer } from "../components/XWFlowComposer";
import { XWFlowHero } from "../components/XWFlowHero";
import { XWFlowSiteHeader } from "../components/XWFlowSiteHeader";
import { XWFlowStage } from "../components/XWFlowStage";
import { MountScope } from "../app/mount";
import { href, navigate } from "../app/router";
import "../styles/landing.css";

export function renderLanding(slot: HTMLElement, scope: MountScope): void {
  slot.classList.add("xwflow-landing");
  slot.replaceChildren();
  const headerHost = scope.host();
  const heroHost = scope.host();
  const stageHost = scope.host();
  const composerHost = scope.host();
  slot.append(headerHost, heroHost, stageHost, composerHost);

  let arabic = true;
  const header = scope.track(
    new XWFlowSiteHeader(headerHost, {
      wordmark: catalog.landing.wordmark,
      links: catalog.landing.nav.map((item) => ({
        id: item.id,
        label: item.label,
        href: href(`/${item.id}`),
      })),
      languageLabel: catalog.landing.language,
      signInLabel: catalog.landing.signIn,
      startLabel: catalog.landing.start,
      onLanguage: () => {
        arabic = !arabic;
        header.setLanguageLabel(arabic ? catalog.landing.language : catalog.landing.languageEnglish);
      },
      onSignIn: () => navigate(catalog.paths.overview),
      onStart: () => navigate(catalog.paths.processes),
    }),
  );

  scope.track(
    new XWFlowHero(heroHost, {
      kicker: catalog.landing.chipKicker,
      announcement: catalog.landing.chipText,
      previewLabel: catalog.landing.chipPreview,
      previewHref: href("/product"),
      title: catalog.landing.title,
      accent: catalog.landing.accent,
      lede: catalog.landing.lede,
      primaryLabel: catalog.landing.build,
      primaryArrow: catalog.landing.buildArrow,
      secondaryLabel: catalog.landing.selfHost,
      onPrimary: () => navigate(catalog.paths.processes),
      onSecondary: () => navigate("/self-host"),
    }),
  );

  scope.track(new XWFlowStage(stageHost, catalog.landing.stage));
  scope.track(new XWFlowComposer(composerHost, catalog.landing.composer));
}
