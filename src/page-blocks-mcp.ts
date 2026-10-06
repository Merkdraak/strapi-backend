import type { Core } from "@strapi/strapi";
import { z } from "@strapi/utils";

type SchemaAttr = {
  type?: string;
  required?: boolean;
  enum?: string[];
  repeatable?: boolean;
  component?: string;
  multiple?: boolean;
};

type FieldInfo = {
  name: string;
  type: string;
  required: boolean;
  enum?: string[];
  component?: string;
  repeatable?: boolean;
  multiple?: boolean;
  fields?: FieldInfo[];
};

const leafField = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean(),
  enum: z.array(z.string()).optional(),
  component: z.string().optional(),
  repeatable: z.boolean().optional(),
  multiple: z.boolean().optional(),
});

const fieldInfo = leafField.extend({
  fields: z.array(leafField).optional(),
});

const outputSchema = z.object({
  contentType: z.string(),
  instructions: z.string(),
  pageFields: z.array(fieldInfo),
  blocks: z.array(
    z.object({
      component: z.string(),
      displayName: z.string(),
      fields: z.array(fieldInfo),
    }),
  ),
});

function fieldList(attributes: Record<string, SchemaAttr> | undefined, nested: Map<string, FieldInfo[]>): FieldInfo[] {
  if (!attributes) return [];
  return Object.entries(attributes)
    .filter(([name]) => name !== "id")
    .map(([name, attr]) => {
      const info: FieldInfo = {
        name,
        type: attr.type ?? "unknown",
        required: attr.required === true,
      };
      if (attr.enum) info.enum = attr.enum;
      if (attr.component) info.component = attr.component;
      if (attr.repeatable === true) info.repeatable = true;
      if (attr.multiple === true) info.multiple = true;
      if (attr.component && nested.has(attr.component)) info.fields = nested.get(attr.component);
      return info;
    });
}

function componentByUid(strapi: Core.Strapi, uid: string) {
  const components = strapi.components as unknown as Record<
    string,
    { attributes?: Record<string, SchemaAttr>; info?: { displayName?: string } }
  >;
  return components[uid];
}

function componentFields(strapi: Core.Strapi, uid: string): FieldInfo[] {
  const component = componentByUid(strapi, uid);
  const nested = new Map<string, FieldInfo[]>();
  for (const attr of Object.values(component?.attributes ?? {})) {
    if (!attr.component || nested.has(attr.component)) continue;
    const child = componentByUid(strapi, attr.component);
    nested.set(attr.component, fieldList(child?.attributes, new Map()));
  }
  return fieldList(component?.attributes, nested);
}

export function registerPageBlocksTool(strapi: Core.Strapi) {
  if (strapi.ai.mcp.isEnabled() !== true) return;

  strapi.ai.mcp.registerTool({
    name: "describe_page_blocks",
    title: "Pagina-blokken",
    description:
      "Beschrijft het bestaande content type api::page.page en de sectieblokken die de site en de Puck-editor gebruiken. Maak geen nieuw content type. Schrijf pagina's met de page-create tool. Zet elk blok in sections als { __component, ...velden }. Mediavelden zijn het numerieke id van een bestaand bestand.",
    resolveOutputSchema: () => outputSchema,
    auth: {
      policies: [{ action: "plugin::content-manager.explorer.read", subject: "api::page.page" }],
    },
    createHandler: (app) => async () => {
      const page = app.contentTypes["api::page.page"] as {
        attributes?: Record<string, SchemaAttr & { components?: string[] }>;
      };
      const sectionUids = page.attributes?.sections?.components ?? [];
      const blocks = sectionUids.flatMap((uid) => {
        const component = componentByUid(app, uid);
        if (!component) return [];
        return [
          {
            component: uid,
            displayName: component.info?.displayName ?? uid,
            fields: componentFields(app, uid),
          },
        ];
      });
      const pageFields = fieldList(page.attributes, new Map()).filter((field) => field.name !== "sections");
      const result = {
        contentType: "api::page.page",
        instructions:
          "Gebruik de bestaande page-create tool. Verplichte velden: siteKey, title, navLabel, entryKey, scopeKey (siteKey:entryKey), pageType, visibility, seoTitle, description, cta. Blokken horen in sections met __component, bijvoorbeeld sections.hero. Dat zijn dezelfde blokken als in de Puck-editor. Publiceer daarna met de page-publish tool. Maak geen nieuw content type.",
        pageFields,
        blocks,
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
        structuredContent: result,
      };
    },
  });
}
