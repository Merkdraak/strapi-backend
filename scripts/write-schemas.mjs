import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function write(relativePath, data) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof data === "string" ? data : `${JSON.stringify(data, null, 2)}\n`);
}

function component(collectionName, displayName, attributes, icon = "layer") {
  return {
    collectionName,
    info: { displayName, icon },
    options: {},
    attributes,
  };
}

const textItem = component("components_shared_text_items", "Text item", {
  text: { type: "text", required: true },
});

const step = component("components_shared_steps", "Step", {
  number: { type: "string" },
  title: { type: "string", required: true },
  text: { type: "text" },
  tone: { type: "string" },
});

const faqItem = component("components_shared_faq_items", "FAQ item", {
  question: { type: "string", required: true },
  answer: { type: "text", required: true },
});

const stat = component("components_shared_stats", "Stat", {
  value: { type: "string", required: true },
  label: { type: "string", required: true },
  trend: { type: "boolean", default: false },
  badge: { type: "string" },
  note: { type: "string" },
  detail: { type: "string" },
  accent: { type: "enumeration", enum: ["orange", "red", "amber", "emerald"] },
  emphasize: { type: "boolean", default: false },
});

const namedItem = component("components_shared_named_items", "Named item", {
  itemId: { type: "string" },
  name: { type: "string", required: true },
});

const serviceCard = component("components_shared_service_cards", "Service card", {
  title: { type: "string", required: true },
  description: { type: "text", required: true },
  items: { type: "component", repeatable: true, component: "shared.text-item" },
  accent: { type: "enumeration", enum: ["orange", "red", "amber", "emerald"], default: "orange" },
});

const pillar = component("components_shared_pillars", "Pillar", {
  title: { type: "string", required: true },
  description: { type: "text", required: true },
  accent: { type: "enumeration", enum: ["orange", "red", "amber", "emerald"], default: "orange" },
});

const teamMember = component("components_shared_team_members", "Team member", {
  initials: { type: "string", required: true },
  name: { type: "string", required: true },
  role: { type: "string", required: true },
  bio: { type: "text" },
  accent: { type: "enumeration", enum: ["orange", "red", "amber", "emerald"], default: "orange" },
  ring: { type: "string" },
});

const articleType = component("components_shared_article_types", "Article type", {
  title: { type: "string", required: true },
  example: { type: "string", required: true },
});

const pageLink = component("components_nav_page_links", "Page link", {
  label: { type: "string" },
  page: { type: "relation", relation: "oneToOne", target: "api::page.page" },
});

const navGroup = component("components_nav_groups", "Nav group", {
  links: { type: "component", repeatable: true, component: "nav.page-link" },
});

const navColumn = component("components_nav_columns", "Nav column", {
  label: { type: "string", required: true },
  groups: { type: "component", repeatable: true, component: "nav.group" },
});

const navFeature = component("components_nav_features", "Nav feature", {
  title: { type: "string", required: true },
  body: { type: "text", required: true },
  href: { type: "string", required: true },
  cta: { type: "string", required: true },
});

const footerLink = component("components_nav_footer_links", "Footer link", {
  label: { type: "string", required: true },
  href: { type: "string", required: true },
});

const blocks = {
  "sections/hero": component("components_sections_heroes", "Hero", {
    eyebrow: { type: "string" },
    title: { type: "string", required: true },
    highlight: { type: "string" },
    body: { type: "text" },
    primaryLabel: { type: "string" },
    primaryHref: { type: "string" },
    secondaryLabel: { type: "string" },
    secondaryHref: { type: "string" },
    stats: { type: "component", repeatable: true, component: "shared.stat" },
  }),
  "sections/client-logos": component("components_sections_client_logos", "Client logos", {
    clients: { type: "component", repeatable: true, component: "shared.named-item" },
  }),
  "sections/service-cards": component("components_sections_service_cards", "Service cards", {
    cards: { type: "component", repeatable: true, component: "shared.service-card" },
  }),
  "sections/results": component("components_sections_results", "Results", {
    stats: { type: "component", repeatable: true, component: "shared.stat" },
    chartLabels: { type: "json" },
  }),
  "sections/case-grid": component("components_sections_case_grids", "Case grid", {
    heading: { type: "string" },
  }),
  "sections/testimonial": component("components_sections_testimonials", "Testimonial", {
    quote: { type: "text", required: true },
    name: { type: "string", required: true },
    role: { type: "string" },
  }),
  "sections/process": component("components_sections_processes", "Process", {
    steps: { type: "component", repeatable: true, component: "shared.step" },
  }),
  "sections/why-us": component("components_sections_why_us", "Why us", {
    pillars: { type: "component", repeatable: true, component: "shared.pillar" },
  }),
  "sections/team": component("components_sections_teams", "Team", {
    heading: { type: "string" },
    note: { type: "text" },
    members: { type: "component", repeatable: true, component: "shared.team-member" },
  }),
  "sections/contact-cta": component("components_sections_contact_ctas", "Contact CTA", {
    title: { type: "string" },
    body: { type: "text" },
    label: { type: "string" },
    href: { type: "string" },
  }),
  "sections/notice": component("components_sections_notices", "Notice", {
    body: { type: "text", required: true },
  }),
  "sections/prose": component("components_sections_proses", "Prose", {
    heading: { type: "string" },
    body: { type: "text", required: true },
  }),
  "sections/bullet-list": component("components_sections_bullet_lists", "Bullet list", {
    heading: { type: "string" },
    variant: { type: "enumeration", enum: ["problems", "deliverables", "plain"], default: "plain" },
    items: { type: "component", repeatable: true, component: "shared.text-item" },
  }),
  "sections/numbered-steps": component("components_sections_numbered_steps", "Numbered steps", {
    heading: { type: "string" },
    steps: { type: "component", repeatable: true, component: "shared.step" },
  }),
  "sections/faq": component("components_sections_faqs", "FAQ", {
    heading: { type: "string" },
    items: { type: "component", repeatable: true, component: "shared.faq-item" },
  }),
  "sections/price-factors": component("components_sections_price_factors", "Price factors", {
    heading: { type: "string" },
    items: { type: "component", repeatable: true, component: "shared.text-item" },
  }),
  "sections/case-story": component("components_sections_case_stories", "Case story", {
    category: { type: "string" },
    sector: { type: "string" },
    summary: { type: "text" },
    approach: { type: "component", repeatable: true, component: "shared.text-item" },
    tools: { type: "string" },
    imageSrc: { type: "string" },
    imageAlt: { type: "string" },
    imageWidth: { type: "integer" },
    imageHeight: { type: "integer" },
    metrics: { type: "component", repeatable: true, component: "shared.stat" },
  }),
  "sections/page-index": component("components_sections_page_indexes", "Page index", {
    mode: { type: "enumeration", enum: ["children", "cases", "knowledge"], default: "children" },
    notice: { type: "text" },
    articleTypes: { type: "component", repeatable: true, component: "shared.article-type" },
    knowledgeNote: { type: "text" },
    serviceKeys: { type: "json" },
  }),
  "sections/link-list": component("components_sections_link_lists", "Link list", {
    heading: { type: "string" },
    items: { type: "component", repeatable: true, component: "shared.text-item" },
  }),
  "nav/mega": component("components_nav_megas", "Mega menu", {
    menuId: { type: "string", required: true },
    label: { type: "string", required: true },
    description: { type: "text" },
    columns: { type: "component", repeatable: true, component: "nav.column" },
    feature: { type: "component", repeatable: false, component: "nav.feature" },
  }, "grid"),
  "nav/dropdown": component("components_nav_dropdowns", "Dropdown", {
    label: { type: "string", required: true },
    links: { type: "component", repeatable: true, component: "nav.page-link" },
  }, "bulletList"),
  "nav/link": component("components_nav_links", "Link", {
    label: { type: "string", required: true },
    page: { type: "relation", relation: "oneToOne", target: "api::page.page" },
  }, "link"),
};

const sectionNames = Object.keys(blocks)
  .filter((name) => name.startsWith("sections/"))
  .map((name) => `sections.${name.slice("sections/".length)}`);

const navItemNames = ["nav.mega", "nav.dropdown", "nav.link"];

write("src/components/shared/text-item.json", textItem);
write("src/components/shared/step.json", step);
write("src/components/shared/faq-item.json", faqItem);
write("src/components/shared/stat.json", stat);
write("src/components/shared/named-item.json", namedItem);
write("src/components/shared/service-card.json", serviceCard);
write("src/components/shared/pillar.json", pillar);
write("src/components/shared/team-member.json", teamMember);
write("src/components/shared/article-type.json", articleType);
write("src/components/nav/page-link.json", pageLink);
write("src/components/nav/group.json", navGroup);
write("src/components/nav/column.json", navColumn);
write("src/components/nav/feature.json", navFeature);
write("src/components/nav/footer-link.json", footerLink);

for (const [name, schema] of Object.entries(blocks)) {
  write(`src/components/${name}.json`, schema);
}

const site = {
  kind: "collectionType",
  collectionName: "sites",
  info: { singularName: "site", pluralName: "sites", displayName: "Site" },
  options: { draftAndPublish: true },
  attributes: {
    key: { type: "uid", targetField: "name", required: true },
    name: { type: "string", required: true },
    domain: { type: "string" },
    phoneDisplay: { type: "string" },
    phoneHref: { type: "string" },
    email: { type: "string" },
    emailHref: { type: "string" },
    address: { type: "string" },
    kvk: { type: "string" },
    btw: { type: "string" },
    hours: { type: "string" },
    defaultTitle: { type: "string" },
    defaultDescription: { type: "text" },
    footerText: { type: "text" },
    footerDisclaimer: { type: "string" },
  },
};

const page = {
  kind: "collectionType",
  collectionName: "pages",
  info: { singularName: "page", pluralName: "pages", displayName: "Page" },
  options: { draftAndPublish: true },
  attributes: {
    site: { type: "relation", relation: "manyToOne", target: "api::site.site" },
    siteKey: { type: "string", required: true },
    entryKey: { type: "string", required: true },
    scopeKey: { type: "string", required: true, unique: true },
    title: { type: "string", required: true },
    navLabel: { type: "string", required: true },
    slug: { type: "string", required: true },
    pageType: {
      type: "enumeration",
      enum: ["home", "company", "overview", "service", "case", "knowledge"],
      required: true,
    },
    cluster: { type: "string" },
    phase: { type: "integer", default: 1 },
    visibility: {
      type: "enumeration",
      enum: ["planned", "concept", "published"],
      default: "planned",
      required: true,
    },
    seoTitle: { type: "string", required: true },
    description: { type: "text", required: true },
    intro: { type: "text" },
    eyebrow: { type: "string" },
    cta: {
      type: "enumeration",
      enum: ["marketingscan", "websitescan", "contact", "cases"],
      default: "marketingscan",
      required: true,
    },
    parent: { type: "relation", relation: "manyToOne", target: "api::page.page" },
    related: { type: "relation", relation: "oneToMany", target: "api::page.page" },
    sections: { type: "dynamiczone", components: sectionNames },
  },
};

const navigation = {
  kind: "collectionType",
  collectionName: "navigations",
  info: { singularName: "navigation", pluralName: "navigations", displayName: "Navigation" },
  options: { draftAndPublish: true },
  attributes: {
    site: { type: "relation", relation: "oneToOne", target: "api::site.site" },
    siteKey: { type: "string", required: true, unique: true },
    items: { type: "dynamiczone", components: navItemNames },
    footerServices: { type: "component", repeatable: true, component: "nav.footer-link" },
    footerOrganization: { type: "component", repeatable: true, component: "nav.footer-link" },
    mobileTopics: { type: "relation", relation: "oneToMany", target: "api::page.page" },
  },
};

write("src/api/site/content-types/site/schema.json", site);
write("src/api/page/content-types/page/schema.json", page);
write("src/api/navigation/content-types/navigation/schema.json", navigation);

const factory = (uid, kind) =>
  `import { factories } from "@strapi/strapi";\n\nexport default factories.createCore${kind}("${uid}");\n`;

for (const [name, uid] of [
  ["site", "api::site.site"],
  ["page", "api::page.page"],
  ["navigation", "api::navigation.navigation"],
]) {
  write(`src/api/${name}/controllers/${name}.ts`, factory(uid, "Controller"));
  write(`src/api/${name}/services/${name}.ts`, factory(uid, "Service"));
  write(`src/api/${name}/routes/${name}.ts`, factory(uid, "Router"));
}

console.log("schemas written", sectionNames.length);
