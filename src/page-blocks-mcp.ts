import { createRequire } from "module";
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

const wrapped: unique symbol = Symbol.for("merkdraak.page-section-schema");

type DataSchemaModule = {
  buildDataSchema: (
    strapi: Core.Strapi,
    schema: { uid?: string },
    attributes: Record<string, { components?: string[] }>,
    permittedFields: Set<string> | null | undefined,
  ) => z.ZodObject<z.ZodRawShape>;
  buildComponentInputSchema: (strapi: Core.Strapi, uid: string) => z.ZodObject<z.ZodRawShape>;
};

function pageSectionsSchema(app: Core.Strapi, components: string[], schemas: DataSchemaModule) {
  const options = components.map((uid) =>
    schemas.buildComponentInputSchema(app, uid).extend({
      __component: z.literal(uid),
    }),
  );
  if (options.length < 2) return undefined;
  const section = z.discriminatedUnion("__component", options as [(typeof options)[0], ...typeof options]);
  return z
    .array(section)
    .optional()
    .describe(
      "Blokken van de pagina. Alleen deze bestaande onderdelen, dezelfde als in de Puck-editor. Mediavelden zijn het numerieke id van een bestaand bestand.",
    );
}

function installPageSectionSchema() {
  const schemas = createRequire(require.resolve("@strapi/content-manager/package.json"))(
    "./dist/server/mcp/schemas/data-schema.js",
  ) as DataSchemaModule & {
    [wrapped]?: true;
  };
  if (schemas[wrapped]) return;
  const original = schemas.buildDataSchema;
  const buildDataSchema: DataSchemaModule["buildDataSchema"] = (app, schema, attributes, permittedFields) => {
    const built = original(app, schema, attributes, permittedFields);
    const uid = schema.uid;
    if ((uid !== "api::page.page" && uid !== "api::case.case") || !built.shape.sections) return built;
    const sections = pageSectionsSchema(app, attributes.sections?.components ?? [], schemas);
    if (!sections) return built;
    return z.object({ ...built.shape, sections }).strict();
  };
  schemas.buildDataSchema = buildDataSchema;
  schemas[wrapped] = true;
}

export function registerPageBlocksTool(strapi: Core.Strapi) {
  if (strapi.ai.mcp.isEnabled() !== true) return;
  installPageSectionSchema();

  strapi.ai.mcp.registerTool({
    name: "describe_page_blocks",
    title: "Pagina-blokken",
    description:
      "Optioneel overzicht van de paginablokken. create_page en update_page op api::page.page, create_case en update_case op api::case.case. Alleen bestaande blokken. Redactie gebeurt in Puck, niet via een nieuw content type.",
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
          "Pagina's: create_page op api::page.page. Cases: create_case op api::case.case, zelfde blokken, slug altijd cases/{naam}. Verplichte paginavelden: siteKey, title, navLabel, entryKey, scopeKey (siteKey:entryKey), pageType, visibility, seoTitle, description en cta. Cases hebben geen pageType. Redactie gebeurt in de Puck-editor.",
        pageFields,
        blocks,
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
        structuredContent: result,
      };
    },
  });

  strapi.ai.mcp.registerTool({
    name: "describe_case_blocks",
    title: "Case-blokken",
    description:
      "Blokken voor api::case.case. create_case en update_case gebruiken dezelfde Puck-blokken als pagina's. Slug is cases/{naam}.",
    resolveOutputSchema: () => outputSchema,
    auth: {
      policies: [{ action: "plugin::content-manager.explorer.read", subject: "api::case.case" }],
    },
    createHandler: (app) => async () => {
      const entry = app.contentTypes["api::case.case"] as {
        attributes?: Record<string, SchemaAttr & { components?: string[] }>;
      };
      const sectionUids = entry.attributes?.sections?.components ?? [];
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
      const pageFields = fieldList(entry.attributes, new Map()).filter((field) => field.name !== "sections");
      const result = {
        contentType: "api::case.case",
        instructions:
          "Een case maken gaat via create_case op api::case.case. sections bevat alleen bestaande Puck-blokken. Verplichte velden: siteKey, title, navLabel, entryKey, scopeKey (siteKey:entryKey), visibility, seoTitle, description en cta. slug wordt cases/{naam}. composed is altijd true. Redactie gebeurt in Puck.",
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
