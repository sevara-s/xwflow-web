import { api } from "../../api/client";
import type { ViewContext } from "../../app/view";
import type { Node } from "../../ui/kit";
import { hero } from "./landing-hero";
import { brand, marquee, migrate, notations, prompt, start, stats, truth } from "./landing-sections";

/** The website's home: the hero, then its bands in the prototype's order. */
export async function view(context: ViewContext): Promise<Node[]> {
  const landing = await api.getLanding();
  return [
    hero(context, landing),
    stats(landing),
    marquee(landing),
    prompt(context),
    truth(landing),
    brand(landing),
    notations(landing),
    migrate(landing),
    start(context),
  ];
}
