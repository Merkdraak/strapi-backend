import type { Core } from "@strapi/strapi";

export type EditorArrayRequired = {
  component: string;
  fields: string[];
  arrays?: Record<string, EditorArrayRequired>;
};

export type EditorBlockRequired = {
  fields: string[];
  arrays?: Record<string, EditorArrayRequired>;
};

export type EditorRequiredFields = {
  version: 1;
  pageRoot: string[];
  caseRoot: string[];
  blocks: Record<string, EditorBlockRequired>;
};

const SKIP_ROOT = new Set([
  "site",
  "siteKey",
  "entryKey",
  "scopeKey",
  "parent",
  "related",
  "sections",
  "cluster",
  "phase",
  "composed",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "createdBy",
  "updatedBy",
  "locale",
  "localizations",
]);

// Media/json/relation are intentionally skipped (R2/R3): soft arrays stay unvalidated
// when they have no scalar required leaves; row JSON slots are out of required-sync scope.
const SKIP_ATTR_TYPES = new Set(["relation", "media", "dynamiczone", "json", "password", "uid"]);

type Attr = {
  type?: string;
  required?: boolean;
  component?: string;
  repeatable?: boolean;
  components?: string[];
};

type SchemaLike = {
  attributes?: Record<string, Attr>;
};

let cached: EditorRequiredFields | null = null;

function modelOf(strapi: Core.Strapi, uid: string): SchemaLike | null {
  const contentTypes = strapi.contentTypes as unknown as Record<string, SchemaLike | undefined>;
  if (contentTypes[uid]) return contentTypes[uid] ?? null;
  const components = strapi.components as unknown as Record<string, SchemaLike | undefined>;
  return components[uid] ?? null;
}

function requiredLeaves(strapi: Core.Strapi, uid: string): string[] {
  const model = modelOf(strapi, uid);
  if (!model?.attributes) return [];
  const fields: string[] = [];
  for (const [name, attr] of Object.entries(model.attributes)) {
    if (!attr || typeof attr !== "object") continue;
    if (SKIP_ATTR_TYPES.has(String(attr.type ?? ""))) continue;
    if (attr.type === "component") continue;
    if (attr.required === true) fields.push(name);
  }
  return fields.sort();
}

function nestedArrays(strapi: Core.Strapi, uid: string, depth: number): Record<string, EditorArrayRequired> {
  if (depth <= 0) return {};
  const model = modelOf(strapi, uid);
  if (!model?.attributes) return {};
  const arrays: Record<string, EditorArrayRequired> = {};
  for (const [name, attr] of Object.entries(model.attributes)) {
    if (!attr || typeof attr !== "object") continue;
    if (attr.type !== "component" || !attr.component || !attr.repeatable) continue;
    const fields = requiredLeaves(strapi, attr.component);
    const childArrays = nestedArrays(strapi, attr.component, depth - 1);
    if (!fields.length && !Object.keys(childArrays).length) continue;
    const entry: EditorArrayRequired = { component: attr.component, fields };
    if (Object.keys(childArrays).length) entry.arrays = childArrays;
    arrays[name] = entry;
  }
  return arrays;
}

function blockRequired(strapi: Core.Strapi, uid: string): EditorBlockRequired | null {
  const model = modelOf(strapi, uid);
  if (!model?.attributes) return null;
  const fields: string[] = [];
  const arrays: Record<string, EditorArrayRequired> = {};
  for (const [name, attr] of Object.entries(model.attributes)) {
    if (!attr || typeof attr !== "object") continue;
    if (attr.type === "component" && attr.component) {
      if (!attr.repeatable) continue;
      const nested = requiredLeaves(strapi, attr.component);
      // Depth 2: service-card.items, case-tab.approach/metrics, etc.
      const childArrays = nestedArrays(strapi, attr.component, 1);
      if (!nested.length && !Object.keys(childArrays).length) continue;
      const entry: EditorArrayRequired = { component: attr.component, fields: nested };
      if (Object.keys(childArrays).length) entry.arrays = childArrays;
      arrays[name] = entry;
      continue;
    }
    if (SKIP_ATTR_TYPES.has(String(attr.type ?? ""))) continue;
    if (attr.required === true) fields.push(name);
  }
  const block: EditorBlockRequired = { fields: [...new Set(fields)].sort() };
  if (Object.keys(arrays).length) block.arrays = arrays;
  if (!block.fields.length && !block.arrays) return null;
  return block;
}

function rootRequired(strapi: Core.Strapi, uid: string): string[] {
  const model = modelOf(strapi, uid);
  if (!model?.attributes) return [];
  const fields: string[] = [];
  for (const [name, attr] of Object.entries(model.attributes)) {
    if (SKIP_ROOT.has(name)) continue;
    if (!attr || typeof attr !== "object") continue;
    if (SKIP_ATTR_TYPES.has(String(attr.type ?? ""))) continue;
    if (attr.type === "component") continue;
    if (attr.required === true) fields.push(name);
  }
  return fields.sort();
}

function sectionUids(strapi: Core.Strapi): string[] {
  const uids = new Set<string>();
  for (const uid of ["api::page.page", "api::case.case"] as const) {
    const model = modelOf(strapi, uid);
    const sections = model?.attributes?.sections;
    if (sections?.type === "dynamiczone" && Array.isArray(sections.components)) {
      for (const component of sections.components) uids.add(String(component));
    }
  }
  return [...uids].sort();
}

export function buildEditorRequiredFields(strapi: Core.Strapi): EditorRequiredFields {
  if (cached) return cached;
  const blocks: Record<string, EditorBlockRequired> = {};
  for (const uid of sectionUids(strapi)) {
    const block = blockRequired(strapi, uid);
    if (block) blocks[uid] = block;
  }
  cached = {
    version: 1,
    pageRoot: rootRequired(strapi, "api::page.page"),
    caseRoot: rootRequired(strapi, "api::case.case"),
    blocks,
  };
  return cached;
}

export function clearEditorRequiredFieldsCache() {
  cached = null;
}
