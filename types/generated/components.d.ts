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

export interface SectionsAccordion extends Struct.ComponentSchema {
  collectionName: 'components_sections_accordions';
  info: {
    displayName: 'Uitklap';
    icon: 'layer';
  };
  attributes: {
    anchor: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.accordion-item', true>;
  };
}

export interface SectionsBeforeAfter extends Struct.ComponentSchema {
  collectionName: 'components_sections_before_afters';
  info: {
    displayName: 'Voor en na';
    icon: 'picture';
  };
  attributes: {
    after: Schema.Attribute.Media<'images'>;
    afterAlt: Schema.Attribute.String;
    afterCaption: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    before: Schema.Attribute.Media<'images'>;
    beforeAlt: Schema.Attribute.String;
    beforeCaption: Schema.Attribute.String;
    heading: Schema.Attribute.String;
  };
}

export interface SectionsBulletList extends Struct.ComponentSchema {
  collectionName: 'components_sections_bullet_lists';
  info: {
    displayName: 'Lijst';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    anchor: Schema.Attribute.String;
    appearance: Schema.Attribute.Enumeration<['dark', 'light', 'accent']> &
      Schema.Attribute.DefaultTo<'dark'>;
    backgroundColor: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.text-item', true>;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
    variant: Schema.Attribute.Enumeration<
      ['problems', 'deliverables', 'plain']
    > &
      Schema.Attribute.DefaultTo<'plain'>;
  };
}

export interface SectionsButton extends Struct.ComponentSchema {
  collectionName: 'components_sections_buttons';
  info: {
    displayName: 'Knop';
    icon: 'cursor';
  };
  attributes: {
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    anchor: Schema.Attribute.String;
    href: Schema.Attribute.String;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    space: Schema.Attribute.String;
  };
}

export interface SectionsButtonRow extends Struct.ComponentSchema {
  collectionName: 'components_sections_button_rows';
  info: {
    displayName: 'Knoppen';
    icon: 'cursor';
  };
  attributes: {
    anchor: Schema.Attribute.String;
    primaryHref: Schema.Attribute.String;
    primaryLabel: Schema.Attribute.String;
    secondaryHref: Schema.Attribute.String;
    secondaryLabel: Schema.Attribute.String;
  };
}

export interface SectionsCards extends Struct.ComponentSchema {
  collectionName: 'components_sections_cards';
  info: {
    displayName: 'Kaarten';
    icon: 'grid';
  };
  attributes: {
    anchor: Schema.Attribute.String;
    cards: Schema.Attribute.Component<'shared.content-card', true>;
    heading: Schema.Attribute.String;
  };
}

export interface SectionsCaseGrid extends Struct.ComponentSchema {
  collectionName: 'components_sections_case_grids';
  info: {
    displayName: 'Cases';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    backgroundColor: Schema.Attribute.String;
    caseKeys: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsCaseStory extends Struct.ComponentSchema {
  collectionName: 'components_sections_case_stories';
  info: {
    displayName: 'Caseverhaal';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    anchor: Schema.Attribute.String;
    appearance: Schema.Attribute.Enumeration<['dark', 'light', 'accent']> &
      Schema.Attribute.DefaultTo<'dark'>;
    approach: Schema.Attribute.Component<'shared.text-item', true>;
    backgroundColor: Schema.Attribute.String;
    category: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    imageAlt: Schema.Attribute.String;
    imageHeight: Schema.Attribute.Integer;
    imageSrc: Schema.Attribute.String;
    imageWidth: Schema.Attribute.Integer;
    metrics: Schema.Attribute.Component<'shared.stat', true>;
    sector: Schema.Attribute.String;
    space: Schema.Attribute.String;
    summary: Schema.Attribute.Text;
    textColor: Schema.Attribute.String;
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
    accentColor: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    backgroundColor: Schema.Attribute.String;
    clients: Schema.Attribute.Component<'shared.named-item', true>;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsColumns extends Struct.ComponentSchema {
  collectionName: 'components_sections_columns';
  info: {
    displayName: 'Twee kolommen';
    icon: 'layout';
  };
  attributes: {
    anchor: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    leftBody: Schema.Attribute.Text;
    leftHeading: Schema.Attribute.String;
    rightBody: Schema.Attribute.Text;
    rightHeading: Schema.Attribute.String;
  };
}

export interface SectionsContactCta extends Struct.ComponentSchema {
  collectionName: 'components_sections_contact_ctas';
  info: {
    displayName: 'Contact';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    backgroundColor: Schema.Attribute.String;
    body: Schema.Attribute.Text;
    eyebrow: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    href: Schema.Attribute.String;
    label: Schema.Attribute.String;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface SectionsDivider extends Struct.ComponentSchema {
  collectionName: 'components_sections_dividers';
  info: {
    displayName: 'Scheiding';
    icon: 'minus';
  };
  attributes: {
    anchor: Schema.Attribute.String;
    space: Schema.Attribute.String;
  };
}

export interface SectionsDocument extends Struct.ComponentSchema {
  collectionName: 'components_sections_documents';
  info: {
    displayName: 'Document';
    icon: 'file';
  };
  attributes: {
    anchor: Schema.Attribute.String;
    file: Schema.Attribute.Media<'files' | 'images'>;
    heading: Schema.Attribute.String;
    href: Schema.Attribute.String;
    label: Schema.Attribute.String;
  };
}

export interface SectionsExpert extends Struct.ComponentSchema {
  collectionName: 'components_sections_experts';
  info: {
    displayName: 'Expert';
    icon: 'user';
  };
  attributes: {
    alt: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    bio: Schema.Attribute.Text;
    heading: Schema.Attribute.String;
    href: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String;
    pageId: Schema.Attribute.String;
    role: Schema.Attribute.String;
  };
}

export interface SectionsFaq extends Struct.ComponentSchema {
  collectionName: 'components_sections_faqs';
  info: {
    displayName: 'Vragen';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    anchor: Schema.Attribute.String;
    appearance: Schema.Attribute.Enumeration<['dark', 'light', 'accent']> &
      Schema.Attribute.DefaultTo<'dark'>;
    backgroundColor: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.faq-item', true>;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsGallery extends Struct.ComponentSchema {
  collectionName: 'components_sections_galleries';
  info: {
    displayName: 'Galerij';
    icon: 'picture';
  };
  attributes: {
    anchor: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.slide', true>;
  };
}

export interface SectionsHeading extends Struct.ComponentSchema {
  collectionName: 'components_sections_headings';
  info: {
    displayName: 'Kop';
    icon: 'heading';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    anchor: Schema.Attribute.String;
    appearance: Schema.Attribute.Enumeration<['dark', 'light', 'accent']> &
      Schema.Attribute.DefaultTo<'dark'>;
    backgroundColor: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    headingLevel: Schema.Attribute.String;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsHero extends Struct.ComponentSchema {
  collectionName: 'components_sections_heroes';
  info: {
    displayName: 'Hero';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    backgroundColor: Schema.Attribute.String;
    body: Schema.Attribute.Text;
    eyebrow: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    highlight: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    primaryHref: Schema.Attribute.String;
    primaryLabel: Schema.Attribute.String;
    secondaryHref: Schema.Attribute.String;
    secondaryLabel: Schema.Attribute.String;
    space: Schema.Attribute.String;
    stats: Schema.Attribute.Component<'shared.stat', true>;
    textColor: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SectionsImage extends Struct.ComponentSchema {
  collectionName: 'components_sections_images';
  info: {
    displayName: 'Afbeelding';
    icon: 'picture';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    alt: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    backgroundColor: Schema.Attribute.String;
    caption: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    href: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
    width: Schema.Attribute.String;
  };
}

export interface SectionsImageSlider extends Struct.ComponentSchema {
  collectionName: 'components_sections_image_sliders';
  info: {
    displayName: 'Slider';
    icon: 'picture';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    backgroundColor: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    slides: Schema.Attribute.Component<'shared.slide', true>;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
    width: Schema.Attribute.String;
  };
}

export interface SectionsLinkList extends Struct.ComponentSchema {
  collectionName: 'components_sections_link_lists';
  info: {
    displayName: 'Links';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    anchor: Schema.Attribute.String;
    appearance: Schema.Attribute.Enumeration<['dark', 'light', 'accent']> &
      Schema.Attribute.DefaultTo<'dark'>;
    backgroundColor: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.text-item', true>;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsLocation extends Struct.ComponentSchema {
  collectionName: 'components_sections_locations';
  info: {
    displayName: 'Locatie';
    icon: 'pinMap';
  };
  attributes: {
    anchor: Schema.Attribute.String;
    city: Schema.Attribute.String;
    email: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    href: Schema.Attribute.String;
    name: Schema.Attribute.String;
    phone: Schema.Attribute.String;
    postalCode: Schema.Attribute.String;
    street: Schema.Attribute.String;
  };
}

export interface SectionsNotice extends Struct.ComponentSchema {
  collectionName: 'components_sections_notices';
  info: {
    displayName: 'Mededeling';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    anchor: Schema.Attribute.String;
    appearance: Schema.Attribute.Enumeration<['dark', 'light', 'accent']> &
      Schema.Attribute.DefaultTo<'dark'>;
    backgroundColor: Schema.Attribute.String;
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    fontSize: Schema.Attribute.String;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsNumberedSteps extends Struct.ComponentSchema {
  collectionName: 'components_sections_numbered_steps';
  info: {
    displayName: 'Stappen';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    anchor: Schema.Attribute.String;
    appearance: Schema.Attribute.Enumeration<['dark', 'light', 'accent']> &
      Schema.Attribute.DefaultTo<'dark'>;
    backgroundColor: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    space: Schema.Attribute.String;
    steps: Schema.Attribute.Component<'shared.step', true>;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsPageIndex extends Struct.ComponentSchema {
  collectionName: 'components_sections_page_indexes';
  info: {
    displayName: 'Paginaoverzicht';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    anchor: Schema.Attribute.String;
    appearance: Schema.Attribute.Enumeration<['dark', 'light', 'accent']> &
      Schema.Attribute.DefaultTo<'dark'>;
    articleTypes: Schema.Attribute.Component<'shared.article-type', true>;
    backgroundColor: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    knowledgeNote: Schema.Attribute.Text;
    mode: Schema.Attribute.Enumeration<['children', 'cases', 'knowledge']> &
      Schema.Attribute.DefaultTo<'children'>;
    notice: Schema.Attribute.Text;
    serviceKeys: Schema.Attribute.JSON;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsPriceFactors extends Struct.ComponentSchema {
  collectionName: 'components_sections_price_factors';
  info: {
    displayName: 'Prijsfactoren';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    anchor: Schema.Attribute.String;
    appearance: Schema.Attribute.Enumeration<['dark', 'light', 'accent']> &
      Schema.Attribute.DefaultTo<'dark'>;
    backgroundColor: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.text-item', true>;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsProcess extends Struct.ComponentSchema {
  collectionName: 'components_sections_processes';
  info: {
    displayName: 'Werkwijze';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    backgroundColor: Schema.Attribute.String;
    eyebrow: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    intro: Schema.Attribute.Text;
    space: Schema.Attribute.String;
    steps: Schema.Attribute.Component<'shared.step', true>;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsProse extends Struct.ComponentSchema {
  collectionName: 'components_sections_proses';
  info: {
    displayName: 'Tekst';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    anchor: Schema.Attribute.String;
    appearance: Schema.Attribute.Enumeration<['dark', 'light', 'accent']> &
      Schema.Attribute.DefaultTo<'dark'>;
    backgroundColor: Schema.Attribute.String;
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    headingLevel: Schema.Attribute.String;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsResults extends Struct.ComponentSchema {
  collectionName: 'components_sections_results';
  info: {
    displayName: 'Resultaten';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    backgroundColor: Schema.Attribute.String;
    chartLabels: Schema.Attribute.JSON;
    eyebrow: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    intro: Schema.Attribute.Text;
    space: Schema.Attribute.String;
    stats: Schema.Attribute.Component<'shared.stat', true>;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsReviews extends Struct.ComponentSchema {
  collectionName: 'components_sections_reviews';
  info: {
    displayName: 'Reviews';
    icon: 'quote';
  };
  attributes: {
    anchor: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.review-item', true>;
  };
}

export interface SectionsRow extends Struct.ComponentSchema {
  collectionName: 'components_sections_rows';
  info: {
    displayName: 'Rij';
    icon: 'apps';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    backgroundColor: Schema.Attribute.String;
    columns: Schema.Attribute.Enumeration<['2', '3']> &
      Schema.Attribute.DefaultTo<'2'>;
    extra: Schema.Attribute.JSON;
    fontSize: Schema.Attribute.String;
    left: Schema.Attribute.JSON;
    right: Schema.Attribute.JSON;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsServiceCards extends Struct.ComponentSchema {
  collectionName: 'components_sections_service_cards';
  info: {
    displayName: 'Diensten';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    backgroundColor: Schema.Attribute.String;
    cards: Schema.Attribute.Component<'shared.service-card', true>;
    eyebrow: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    intro: Schema.Attribute.Text;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsSources extends Struct.ComponentSchema {
  collectionName: 'components_sections_sources';
  info: {
    displayName: 'Bronnen';
    icon: 'link';
  };
  attributes: {
    anchor: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.source-item', true>;
  };
}

export interface SectionsSplit extends Struct.ComponentSchema {
  collectionName: 'components_sections_splits';
  info: {
    displayName: 'Tekst met beeld';
    icon: 'layout';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    alt: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    appearance: Schema.Attribute.Enumeration<['dark', 'light', 'accent']> &
      Schema.Attribute.DefaultTo<'dark'>;
    backgroundColor: Schema.Attribute.String;
    body: Schema.Attribute.Text;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    href: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    label: Schema.Attribute.String;
    side: Schema.Attribute.String;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsTable extends Struct.ComponentSchema {
  collectionName: 'components_sections_tables';
  info: {
    displayName: 'Tabel';
    icon: 'table';
  };
  attributes: {
    anchor: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    rows: Schema.Attribute.Component<'shared.table-row', true>;
  };
}

export interface SectionsTakeaways extends Struct.ComponentSchema {
  collectionName: 'components_sections_takeaways';
  info: {
    displayName: 'Kernpunten';
    icon: 'bulletList';
  };
  attributes: {
    anchor: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.text-item', true>;
  };
}

export interface SectionsTeam extends Struct.ComponentSchema {
  collectionName: 'components_sections_teams';
  info: {
    displayName: 'Team';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    backgroundColor: Schema.Attribute.String;
    eyebrow: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    members: Schema.Attribute.Component<'shared.team-member', true>;
    note: Schema.Attribute.Text;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsTestimonial extends Struct.ComponentSchema {
  collectionName: 'components_sections_testimonials';
  info: {
    displayName: 'Citaat';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    backgroundColor: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    quote: Schema.Attribute.Text & Schema.Attribute.Required;
    role: Schema.Attribute.String;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
  };
}

export interface SectionsVideo extends Struct.ComponentSchema {
  collectionName: 'components_sections_videos';
  info: {
    displayName: 'Video';
    icon: 'play';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    align: Schema.Attribute.Enumeration<['left', 'center']> &
      Schema.Attribute.DefaultTo<'left'>;
    anchor: Schema.Attribute.String;
    appearance: Schema.Attribute.Enumeration<['dark', 'light', 'accent']> &
      Schema.Attribute.DefaultTo<'dark'>;
    backgroundColor: Schema.Attribute.String;
    caption: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
    transcript: Schema.Attribute.Text;
    url: Schema.Attribute.String;
  };
}

export interface SectionsWhyUs extends Struct.ComponentSchema {
  collectionName: 'components_sections_why_us';
  info: {
    displayName: 'Waarom wij';
    icon: 'layer';
  };
  attributes: {
    accentColor: Schema.Attribute.String;
    anchor: Schema.Attribute.String;
    backgroundColor: Schema.Attribute.String;
    eyebrow: Schema.Attribute.String;
    fontSize: Schema.Attribute.String;
    heading: Schema.Attribute.String;
    intro: Schema.Attribute.Text;
    pillars: Schema.Attribute.Component<'shared.pillar', true>;
    space: Schema.Attribute.String;
    textColor: Schema.Attribute.String;
  };
}

export interface SharedAccordionItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_accordion_items';
  info: {
    displayName: 'Uitklap-item';
    icon: 'layer';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
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

export interface SharedContentCard extends Struct.ComponentSchema {
  collectionName: 'components_shared_content_cards';
  info: {
    displayName: 'Kaart';
    icon: 'layer';
  };
  attributes: {
    alt: Schema.Attribute.String;
    href: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    pageId: Schema.Attribute.String;
    text: Schema.Attribute.Text;
    title: Schema.Attribute.String;
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
    image: Schema.Attribute.Media<'images'>;
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

export interface SharedReviewItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_review_items';
  info: {
    displayName: 'Review';
    icon: 'layer';
  };
  attributes: {
    name: Schema.Attribute.String;
    quote: Schema.Attribute.Text;
    role: Schema.Attribute.String;
    score: Schema.Attribute.String;
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
    href: Schema.Attribute.String;
    items: Schema.Attribute.Component<'shared.text-item', true>;
    pageId: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedSlide extends Struct.ComponentSchema {
  collectionName: 'components_shared_slides';
  info: {
    displayName: 'Slide';
    icon: 'picture';
  };
  attributes: {
    alt: Schema.Attribute.String;
    caption: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSourceItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_source_items';
  info: {
    displayName: 'Bron';
    icon: 'layer';
  };
  attributes: {
    href: Schema.Attribute.String;
    label: Schema.Attribute.String;
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

export interface SharedTableRow extends Struct.ComponentSchema {
  collectionName: 'components_shared_table_rows';
  info: {
    displayName: 'Tabelrij';
    icon: 'layer';
  };
  attributes: {
    label: Schema.Attribute.String;
    text: Schema.Attribute.Text;
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
    image: Schema.Attribute.Media<'images'>;
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
    href: Schema.Attribute.String;
    pageId: Schema.Attribute.String;
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
      'sections.accordion': SectionsAccordion;
      'sections.before-after': SectionsBeforeAfter;
      'sections.bullet-list': SectionsBulletList;
      'sections.button': SectionsButton;
      'sections.button-row': SectionsButtonRow;
      'sections.cards': SectionsCards;
      'sections.case-grid': SectionsCaseGrid;
      'sections.case-story': SectionsCaseStory;
      'sections.client-logos': SectionsClientLogos;
      'sections.columns': SectionsColumns;
      'sections.contact-cta': SectionsContactCta;
      'sections.divider': SectionsDivider;
      'sections.document': SectionsDocument;
      'sections.expert': SectionsExpert;
      'sections.faq': SectionsFaq;
      'sections.gallery': SectionsGallery;
      'sections.heading': SectionsHeading;
      'sections.hero': SectionsHero;
      'sections.image': SectionsImage;
      'sections.image-slider': SectionsImageSlider;
      'sections.link-list': SectionsLinkList;
      'sections.location': SectionsLocation;
      'sections.notice': SectionsNotice;
      'sections.numbered-steps': SectionsNumberedSteps;
      'sections.page-index': SectionsPageIndex;
      'sections.price-factors': SectionsPriceFactors;
      'sections.process': SectionsProcess;
      'sections.prose': SectionsProse;
      'sections.results': SectionsResults;
      'sections.reviews': SectionsReviews;
      'sections.row': SectionsRow;
      'sections.service-cards': SectionsServiceCards;
      'sections.sources': SectionsSources;
      'sections.split': SectionsSplit;
      'sections.table': SectionsTable;
      'sections.takeaways': SectionsTakeaways;
      'sections.team': SectionsTeam;
      'sections.testimonial': SectionsTestimonial;
      'sections.video': SectionsVideo;
      'sections.why-us': SectionsWhyUs;
      'shared.accordion-item': SharedAccordionItem;
      'shared.article-type': SharedArticleType;
      'shared.content-card': SharedContentCard;
      'shared.faq-item': SharedFaqItem;
      'shared.named-item': SharedNamedItem;
      'shared.pillar': SharedPillar;
      'shared.review-item': SharedReviewItem;
      'shared.service-card': SharedServiceCard;
      'shared.slide': SharedSlide;
      'shared.source-item': SharedSourceItem;
      'shared.stat': SharedStat;
      'shared.step': SharedStep;
      'shared.table-row': SharedTableRow;
      'shared.team-member': SharedTeamMember;
      'shared.text-item': SharedTextItem;
    }
  }
}
