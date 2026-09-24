import type { Schema, Struct } from '@strapi/strapi';

export interface NavColumn extends Struct.ComponentSchema {
  collectionName: 'components_nav_columns';
  info: {
    displayName: 'Nav column';
    icon: 'layer';
  };
  attributes: {
    groups: Schema.Attribute.Component<'nav.group', true>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface NavDropdown extends Struct.ComponentSchema {
  collectionName: 'components_nav_dropdowns';
  info: {
    displayName: 'Dropdown';
    icon: 'bulletList';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    links: Schema.Attribute.Component<'nav.page-link', true>;
  };
}

export interface NavFeature extends Struct.ComponentSchema {
  collectionName: 'components_nav_features';
  info: {
    displayName: 'Nav feature';
    icon: 'layer';
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    cta: Schema.Attribute.String & Schema.Attribute.Required;
    href: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface NavFooterLink extends Struct.ComponentSchema {
  collectionName: 'components_nav_footer_links';
  info: {
    displayName: 'Footer link';
    icon: 'layer';
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface NavGroup extends Struct.ComponentSchema {
  collectionName: 'components_nav_groups';
  info: {
    displayName: 'Nav group';
    icon: 'layer';
  };
  attributes: {
    links: Schema.Attribute.Component<'nav.page-link', true>;
  };
}

export interface NavLink extends Struct.ComponentSchema {
  collectionName: 'components_nav_links';
  info: {
    displayName: 'Link';
    icon: 'link';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    page: Schema.Attribute.Relation<'oneToOne', 'api::page.page'>;
  };
}

export interface NavMega extends Struct.ComponentSchema {
  collectionName: 'components_nav_megas';
  info: {
    displayName: 'Mega menu';
    icon: 'grid';
  };
  attributes: {
    columns: Schema.Attribute.Component<'nav.column', true>;
    description: Schema.Attribute.Text;
    feature: Schema.Attribute.Component<'nav.feature', false>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    menuId: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface NavPageLink extends Struct.ComponentSchema {
  collectionName: 'components_nav_page_links';
  info: {
    displayName: 'Page link';
    icon: 'layer';
  };
  attributes: {
    label: Schema.Attribute.String;
    page: Schema.Attribute.Relation<'oneToOne', 'api::page.page'>;
  };
}

export interface SectionsBulletList extends Struct.ComponentSchema {
  collectionName: 'components_sections_bullet_lists';
  info: {
    displayName: 'Lijst';
    icon: 'layer';
  };
  attributes: {
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.text-item', true>;
    variant: Schema.Attribute.Enumeration<
      ['problems', 'deliverables', 'plain']
    > &
      Schema.Attribute.DefaultTo<'plain'>;
  };
}

export interface SectionsCaseGrid extends Struct.ComponentSchema {
  collectionName: 'components_sections_case_grids';
  info: {
    displayName: 'Cases';
    icon: 'layer';
  };
  attributes: {
    heading: Schema.Attribute.String;
  };
}

export interface SectionsCaseStory extends Struct.ComponentSchema {
  collectionName: 'components_sections_case_stories';
  info: {
    displayName: 'Caseverhaal';
    icon: 'layer';
  };
  attributes: {
    approach: Schema.Attribute.Component<'shared.text-item', true>;
    category: Schema.Attribute.String;
    imageAlt: Schema.Attribute.String;
    imageHeight: Schema.Attribute.Integer;
    imageSrc: Schema.Attribute.String;
    imageWidth: Schema.Attribute.Integer;
    metrics: Schema.Attribute.Component<'shared.stat', true>;
    sector: Schema.Attribute.String;
    summary: Schema.Attribute.Text;
    tools: Schema.Attribute.String;
  };
}

export interface SectionsClientLogos extends Struct.ComponentSchema {
  collectionName: 'components_sections_client_logos';
  info: {
    displayName: 'Klanten';
    icon: 'layer';
  };
  attributes: {
    clients: Schema.Attribute.Component<'shared.named-item', true>;
  };
}

export interface SectionsContactCta extends Struct.ComponentSchema {
  collectionName: 'components_sections_contact_ctas';
  info: {
    displayName: 'Contact';
    icon: 'layer';
  };
  attributes: {
    body: Schema.Attribute.Text;
    href: Schema.Attribute.String;
    label: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface SectionsFaq extends Struct.ComponentSchema {
  collectionName: 'components_sections_faqs';
  info: {
    displayName: 'Vragen';
    icon: 'layer';
  };
  attributes: {
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.faq-item', true>;
  };
}

export interface SectionsHero extends Struct.ComponentSchema {
  collectionName: 'components_sections_heroes';
  info: {
    displayName: 'Hero';
    icon: 'layer';
  };
  attributes: {
    body: Schema.Attribute.Text;
    eyebrow: Schema.Attribute.String;
    highlight: Schema.Attribute.String;
    primaryHref: Schema.Attribute.String;
    primaryLabel: Schema.Attribute.String;
    secondaryHref: Schema.Attribute.String;
    secondaryLabel: Schema.Attribute.String;
    stats: Schema.Attribute.Component<'shared.stat', true>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SectionsLinkList extends Struct.ComponentSchema {
  collectionName: 'components_sections_link_lists';
  info: {
    displayName: 'Links';
    icon: 'layer';
  };
  attributes: {
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.text-item', true>;
  };
}

export interface SectionsNotice extends Struct.ComponentSchema {
  collectionName: 'components_sections_notices';
  info: {
    displayName: 'Mededeling';
    icon: 'layer';
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface SectionsNumberedSteps extends Struct.ComponentSchema {
  collectionName: 'components_sections_numbered_steps';
  info: {
    displayName: 'Stappen';
    icon: 'layer';
  };
  attributes: {
    heading: Schema.Attribute.String;
    steps: Schema.Attribute.Component<'shared.step', true>;
  };
}

export interface SectionsPageIndex extends Struct.ComponentSchema {
  collectionName: 'components_sections_page_indexes';
  info: {
    displayName: 'Paginaoverzicht';
    icon: 'layer';
  };
  attributes: {
    articleTypes: Schema.Attribute.Component<'shared.article-type', true>;
    knowledgeNote: Schema.Attribute.Text;
    mode: Schema.Attribute.Enumeration<['children', 'cases', 'knowledge']> &
      Schema.Attribute.DefaultTo<'children'>;
    notice: Schema.Attribute.Text;
    serviceKeys: Schema.Attribute.JSON;
  };
}

export interface SectionsPriceFactors extends Struct.ComponentSchema {
  collectionName: 'components_sections_price_factors';
  info: {
    displayName: 'Prijsfactoren';
    icon: 'layer';
  };
  attributes: {
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.text-item', true>;
  };
}

export interface SectionsProcess extends Struct.ComponentSchema {
  collectionName: 'components_sections_processes';
  info: {
    displayName: 'Werkwijze';
    icon: 'layer';
  };
  attributes: {
    steps: Schema.Attribute.Component<'shared.step', true>;
  };
}

export interface SectionsProse extends Struct.ComponentSchema {
  collectionName: 'components_sections_proses';
  info: {
    displayName: 'Tekst';
    icon: 'layer';
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    heading: Schema.Attribute.String;
  };
}

export interface SectionsResults extends Struct.ComponentSchema {
  collectionName: 'components_sections_results';
  info: {
    displayName: 'Resultaten';
    icon: 'layer';
  };
  attributes: {
    chartLabels: Schema.Attribute.JSON;
    stats: Schema.Attribute.Component<'shared.stat', true>;
  };
}

export interface SectionsServiceCards extends Struct.ComponentSchema {
  collectionName: 'components_sections_service_cards';
  info: {
    displayName: 'Diensten';
    icon: 'layer';
  };
  attributes: {
    cards: Schema.Attribute.Component<'shared.service-card', true>;
  };
}

export interface SectionsTeam extends Struct.ComponentSchema {
  collectionName: 'components_sections_teams';
  info: {
    displayName: 'Team';
    icon: 'layer';
  };
  attributes: {
    heading: Schema.Attribute.String;
    members: Schema.Attribute.Component<'shared.team-member', true>;
    note: Schema.Attribute.Text;
  };
}

export interface SectionsTestimonial extends Struct.ComponentSchema {
  collectionName: 'components_sections_testimonials';
  info: {
    displayName: 'Citaat';
    icon: 'layer';
  };
  attributes: {
    name: Schema.Attribute.String & Schema.Attribute.Required;
    quote: Schema.Attribute.Text & Schema.Attribute.Required;
    role: Schema.Attribute.String;
  };
}

export interface SectionsWhyUs extends Struct.ComponentSchema {
  collectionName: 'components_sections_why_us';
  info: {
    displayName: 'Waarom wij';
    icon: 'layer';
  };
  attributes: {
    pillars: Schema.Attribute.Component<'shared.pillar', true>;
  };
}

export interface SharedArticleType extends Struct.ComponentSchema {
  collectionName: 'components_shared_article_types';
  info: {
    displayName: 'Article type';
    icon: 'layer';
  };
  attributes: {
    example: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_faq_items';
  info: {
    displayName: 'FAQ item';
    icon: 'layer';
  };
  attributes: {
    answer: Schema.Attribute.Text & Schema.Attribute.Required;
    question: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedNamedItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_named_items';
  info: {
    displayName: 'Named item';
    icon: 'layer';
  };
  attributes: {
    itemId: Schema.Attribute.String;
    name: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedPillar extends Struct.ComponentSchema {
  collectionName: 'components_shared_pillars';
  info: {
    displayName: 'Pillar';
    icon: 'layer';
  };
  attributes: {
    accent: Schema.Attribute.Enumeration<
      ['orange', 'red', 'amber', 'emerald']
    > &
      Schema.Attribute.DefaultTo<'orange'>;
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedServiceCard extends Struct.ComponentSchema {
  collectionName: 'components_shared_service_cards';
  info: {
    displayName: 'Service card';
    icon: 'layer';
  };
  attributes: {
    accent: Schema.Attribute.Enumeration<
      ['orange', 'red', 'amber', 'emerald']
    > &
      Schema.Attribute.DefaultTo<'orange'>;
    cardId: Schema.Attribute.String;
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    items: Schema.Attribute.Component<'shared.text-item', true>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedStat extends Struct.ComponentSchema {
  collectionName: 'components_shared_stats';
  info: {
    displayName: 'Stat';
    icon: 'layer';
  };
  attributes: {
    accent: Schema.Attribute.Enumeration<['orange', 'red', 'amber', 'emerald']>;
    badge: Schema.Attribute.String;
    detail: Schema.Attribute.String;
    emphasize: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    note: Schema.Attribute.String;
    trend: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedStep extends Struct.ComponentSchema {
  collectionName: 'components_shared_steps';
  info: {
    displayName: 'Step';
    icon: 'layer';
  };
  attributes: {
    number: Schema.Attribute.String;
    text: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    tone: Schema.Attribute.String;
  };
}

export interface SharedTeamMember extends Struct.ComponentSchema {
  collectionName: 'components_shared_team_members';
  info: {
    displayName: 'Team member';
    icon: 'layer';
  };
  attributes: {
    accent: Schema.Attribute.Enumeration<
      ['orange', 'red', 'amber', 'emerald']
    > &
      Schema.Attribute.DefaultTo<'orange'>;
    bio: Schema.Attribute.Text;
    initials: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    ring: Schema.Attribute.String;
    role: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedTextItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_text_items';
  info: {
    displayName: 'Text item';
    icon: 'layer';
  };
  attributes: {
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'nav.column': NavColumn;
      'nav.dropdown': NavDropdown;
      'nav.feature': NavFeature;
      'nav.footer-link': NavFooterLink;
      'nav.group': NavGroup;
      'nav.link': NavLink;
      'nav.mega': NavMega;
      'nav.page-link': NavPageLink;
      'sections.bullet-list': SectionsBulletList;
      'sections.case-grid': SectionsCaseGrid;
      'sections.case-story': SectionsCaseStory;
      'sections.client-logos': SectionsClientLogos;
      'sections.contact-cta': SectionsContactCta;
      'sections.faq': SectionsFaq;
      'sections.hero': SectionsHero;
      'sections.link-list': SectionsLinkList;
      'sections.notice': SectionsNotice;
      'sections.numbered-steps': SectionsNumberedSteps;
      'sections.page-index': SectionsPageIndex;
      'sections.price-factors': SectionsPriceFactors;
      'sections.process': SectionsProcess;
      'sections.prose': SectionsProse;
      'sections.results': SectionsResults;
      'sections.service-cards': SectionsServiceCards;
      'sections.team': SectionsTeam;
      'sections.testimonial': SectionsTestimonial;
      'sections.why-us': SectionsWhyUs;
      'shared.article-type': SharedArticleType;
      'shared.faq-item': SharedFaqItem;
      'shared.named-item': SharedNamedItem;
      'shared.pillar': SharedPillar;
      'shared.service-card': SharedServiceCard;
      'shared.stat': SharedStat;
      'shared.step': SharedStep;
      'shared.team-member': SharedTeamMember;
      'shared.text-item': SharedTextItem;
    }
  }
}
