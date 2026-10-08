import type { Core } from "@strapi/strapi";

export type EditorBlockRequired = {
  fields: string[];
  arrays?: Record<string, { component: string; fields: string[] }>;
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

function blockRequired(strapi: Core.Strapi, uid: string): EditorBlockRequired | null {
  const model = modelOf(strapi, uid);
  if (!model?.attributes) return null;
  const fields: string[] = [];
  const arrays: Record<string, { component: string; fields: string[] }> = {};
  for (const [name, attr] of Object.entries(model.attributes)) {
    if (!attr || typeof attr !== "object") continue;
    if (attr.type === "component" && attr.component) {
      if (!attr.repeatable) continue;
      const nested = requiredLeaves(strapi, attr.component);
      if (!nested.length) continue;
      arrays[name] = { component: attr.component, fields: nested };
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
