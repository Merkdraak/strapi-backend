import { useMemo, useState, type ReactNode } from "react";
import {
  Box,
  Button,
  Divider,
  Field,
  Flex,
  TextInput,
  Typography,
} from "@strapi/design-system";
import { Plus } from "@strapi/icons";

export type NavPageLink = {
  /** Strapi component id — present on saved rows; absent on newly added drafts. */
  id?: number | string;
  label?: string;
  href?: string;
  page?: {
    entryKey?: string;
    documentId?: string;
    id?: number | string;
    title?: string;
    navLabel?: string;
  };
};
export type NavColumn = { label?: string; groups?: { links?: NavPageLink[] }[] };
export type NavItemRow = {
  __component?: string;
  label?: string;
  href?: string;
  placement?: "main" | "utility";
  menuId?: string;
  description?: string;
  page?: { entryKey?: string; title?: string; navLabel?: string };
  links?: NavPageLink[];
  columns?: NavColumn[];
  feature?: { title?: string; body?: string; href?: string; cta?: string };
  [key: string]: unknown;
};

export type MenuPageOption = {
  entryKey: string;
  title: string;
  navLabel?: string;
  slug?: string;
  documentId?: string;
  /** Strapi visibility — matches frontend routable filter (published|concept). */
  visibility?: string;
};

export type LinkVisibilityStatus = {
  tone: "ok" | "warn" | "error";
  /** True when the local Next.js site would show this link after save + refresh. */
  locallyVisible: boolean;
  message: string;
};

export type MenuValidationIssue = {
  path: string;
  message: string;
  /** Hard errors block Opslaan; warnings explain invisible historical/empty drafts. */
  severity: "error" | "warning";
};

type Selection =
  | { kind: "item"; itemIndex: number }
  | { kind: "intro"; itemIndex: number }
  | { kind: "feature"; itemIndex: number }
  | { kind: "column"; itemIndex: number; columnIndex: number }
  | { kind: "group"; itemIndex: number; columnIndex: number; groupIndex: number }
  | { kind: "megaLink"; itemIndex: number; columnIndex: number; groupIndex: number; linkIndex: number }
  | { kind: "dropdownLink"; itemIndex: number; linkIndex: number };

function kindLabel(component?: string) {
  if (component === "nav.mega") return "Dropdown-menu";
  if (component === "nav.dropdown") return "Submenu";
  return "Link";
}

function isUtilityItem(item: NavItemRow) {
  if (item.__component === "nav.dropdown") return true;
  return item.__component === "nav.link" && item.placement === "utility";
}

function isMainItem(item: NavItemRow) {
  return !isUtilityItem(item);
}

function displayName(item: NavItemRow) {
  const label = (item.label ?? "").trim();
  if (label) return label;
  return `Nieuw ${kindLabel(item.__component).toLowerCase()}`;
}

function pageRef(link: NavPageLink) {
  const key = (link.page?.entryKey ?? "").trim();
  if (key) return key;
  const documentId = (link.page?.documentId ?? "").trim();
  if (documentId) return documentId;
  if (link.page?.id != null && String(link.page.id).trim()) return String(link.page.id);
  return "";
}

function pageCatalogLabel(link: NavPageLink, pages: MenuPageOption[]) {
  const fromRelation = (link.page?.navLabel ?? "").trim() || (link.page?.title ?? "").trim();
  if (fromRelation) return fromRelation;
  const key = pageRef(link);
  if (!key) return "";
  const match = pages.find((page) => page.entryKey === key);
  return (match?.navLabel ?? "").trim() || (match?.title ?? "").trim();
}

/** Handmatige menunaam → pagina-navLabel/titel. Schrijft niets naar opgeslagen data. */
function effectiveLinkName(link: NavPageLink, pages: MenuPageOption[] = []) {
  const label = (link.label ?? "").trim();
  if (label) return label;
  return pageCatalogLabel(link, pages);
}

function linkDisplayName(link: NavPageLink, pages: MenuPageOption[] = []) {
  const effective = effectiveLinkName(link, pages);
  if (effective) return effective;
  const href = (link.href ?? "").trim();
  if (href) return href;
  const key = pageRef(link);
  if (key) return `Opgeslagen pagina (${key})`;
  return "Nieuwe link";
}

/** Empty rows stay in data/save payload, but stay out of the tree until filled or opened. */
function isEmptyLink(link: NavPageLink) {
  return !(link.label ?? "").trim() && !pageRef(link) && !(link.href ?? "").trim();
}

function isSafeOwnUrl(value: string) {
  const href = value.trim();
  if (!href) return false;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  if (href.startsWith("#") && href.length > 1 && !href.startsWith("#/")) return true;
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function pageExists(entryKey: string, pages: MenuPageOption[]) {
  const key = entryKey.trim();
  if (!key) return false;
  return pages.some((page) => page.entryKey === key);
}

function pageByKey(entryKey: string, pages: MenuPageOption[]) {
  const key = entryKey.trim();
  if (!key) return undefined;
  return pages.find((page) => page.entryKey === key);
}

/** Same routable rule as frontend `hrefForPage` in cms.ts. */
function isLocallyRoutableVisibility(visibility?: string) {
  return visibility === "published" || visibility === "concept";
}

function pageOptionLabel(page: MenuPageOption) {
  const name = (page.navLabel || page.title || page.entryKey).trim();
  if (page.visibility === "planned") return `${name} (nog niet gepubliceerd)`;
  if (page.visibility && !isLocallyRoutableVisibility(page.visibility) && page.visibility !== "published") {
    return `${name} (${page.visibility})`;
  }
  return name;
}

/** Saved Strapi rows keep an id; newly added drafts do not. */
function isPersistedLink(link: NavPageLink) {
  return link.id != null && String(link.id).trim() !== "";
}

function linkDestinationKey(link: NavPageLink) {
  const href = (link.href ?? "").trim();
  if (href) return `href:${href}`;
  const key = pageRef(link);
  if (key) return `page:${key}`;
  return "none";
}

/** Partially filled clickable links must have a visible name and a resolvable destination. */
export function validateMenuItems(items: NavItemRow[], pages: MenuPageOption[] = []): MenuValidationIssue[] {
  const issues: MenuValidationIssue[] = [];

  function checkLink(link: NavPageLink, path: string) {
    if (isEmptyLink(link)) return;
    const label = (link.label ?? "").trim();
    const catalog = pageCatalogLabel(link, pages);
    const key = pageRef(link);
    const href = (link.href ?? "").trim();
    const effectiveName = label || catalog;
    const name = effectiveName || key || href || "Nieuwe link";
    const persisted = isPersistedLink(link);

    // Eigen URL: naam en geldige URL zijn verplicht (naam wordt niet uit de URL verzonnen).
    if (href) {
      if (!label) {
        issues.push({
          path,
          severity: "error",
          message: `“${name}” (${path}): vul een zichtbare naam in. Dit is de tekst die bezoekers in het menu zien.`,
        });
      }
      if (!isSafeOwnUrl(href)) {
        issues.push({
          path,
          severity: "error",
          message: `“${name}” (${path}): “${href}” is geen geldige URL. Gebruik bijvoorbeeld /pagina of https://….`,
        });
      }
      return;
    }

    // Paginaverwijzing: lege expliciete naam is ok als navLabel/titel beschikbaar is.
    if (key) {
      const page = pageByKey(key, pages);
      if (!page) {
        if (!persisted) {
          issues.push({
            path,
            severity: "error",
            message: `“${name}” (${path}): de paginaverwijzing “${key}” is hier niet gevonden. Kies een bestaande pagina uit de lijst of vul een geldige eigen URL in.`,
          });
        } else {
          issues.push({
            path,
            severity: "warning",
            message: `“${name}” (${path}): de pagina “${catalog || key}” is lokaal niet gevonden. Opgeslagen in Strapi blijft behouden; op live kan deze pagina wel bestaan. Kies lokaal een andere pagina of URL als je de lokale site wilt bijwerken.`,
          });
        }
        return;
      }
      if (!isLocallyRoutableVisibility(page.visibility)) {
        const pageName = (page.navLabel || page.title || key).trim();
        issues.push({
          path,
          severity: "warning",
          message: `“${name}” (${path}): pagina “${pageName}” is nog niet gepubliceerd (status: ${page.visibility || "onbekend"}). Opgeslagen in Strapi kan wel; op de lokale website verschijnt deze link niet tot de pagina gepubliceerd of concept is. Publiceer de pagina of kies een andere bestemming.`,
        });
      }
      return;
    }

    // Geen bestemming: nieuwe drafts blokkeren; historische rijen alleen waarschuwen.
    if (!persisted) {
      issues.push({
        path,
        severity: "error",
        message: `“${name}” (${path}): deze link heeft geen bestemming en wordt daarom niet weergegeven. Kies een pagina of vul een geldige URL in — anders wordt opslaan geblokkeerd.`,
      });
      return;
    }
    issues.push({
      path,
      severity: "warning",
      message: `“${name}” (${path}): deze link heeft geen bestemming en wordt daarom niet weergegeven. De bestaande rij blijft opgeslagen in Strapi. Kies een pagina of URL om hem zichtbaar te maken; andere menuwijzigingen blijven mogelijk.`,
    });
  }

  function checkDuplicateNames(links: NavPageLink[], path: string) {
    const seen = new Map<string, string>();
    for (const link of links) {
      if (isEmptyLink(link)) continue;
      const name = effectiveLinkName(link, pages).toLowerCase();
      if (!name) continue;
      const dest = linkDestinationKey(link);
      const earlier = seen.get(name);
      if (earlier && earlier !== dest) {
        issues.push({
          path,
          severity: "warning",
          message: `In ${path} staan meerdere links met dezelfde naam “${effectiveLinkName(link, pages)}” maar verschillende bestemmingen. Beide blijven behouden — controleer of dat zo bedoeld is.`,
        });
        return;
      }
      if (!earlier) seen.set(name, dest);
    }
  }

  items.forEach((item, itemIndex) => {
    const itemName = displayName(item);
    if (item.__component === "nav.link") {
      checkLink(
        { id: item.id as number | string | undefined, label: item.label, href: item.href, page: item.page },
        itemName || `Menu-item ${itemIndex + 1}`,
      );
    }
    if (item.__component === "nav.dropdown") {
      (item.links ?? []).forEach((link, linkIndex) => {
        checkLink(link, `${itemName} → link ${linkIndex + 1}`);
      });
      checkDuplicateNames(item.links ?? [], itemName);
    }
    if (item.__component === "nav.mega") {
      (item.columns ?? []).forEach((column, columnIndex) => {
        const colName = (column.label ?? "").trim() || `Categorie ${columnIndex + 1}`;
        (column.groups ?? []).forEach((group, groupIndex) => {
          const groupPath = `${itemName} → ${colName} → Groep ${groupIndex + 1}`;
          (group.links ?? []).forEach((link) => {
            checkLink(link, `${groupPath} → ${linkDisplayName(link, pages) || "link"}`);
          });
          checkDuplicateNames(group.links ?? [], groupPath);
        });
      });
    }
  });

  return issues;
}

export function linkVisibilityStatus(link: NavPageLink, pages: MenuPageOption[] = []): LinkVisibilityStatus {
  if (isEmptyLink(link)) {
    return {
      tone: "warn",
      locallyVisible: false,
      message:
        "Deze link is nog leeg. Opgeslagen in Strapi: alleen als je opslaat met inhoud. Zichtbaar op de lokale website: nee — vul een naam en bestemming in.",
    };
  }
  const label = (link.label ?? "").trim();
  const key = pageRef(link);
  const href = (link.href ?? "").trim();
  const catalog = pageCatalogLabel(link, pages);
  const name = effectiveLinkName(link, pages) || catalog || key || href || "deze link";

  if (href) {
    if (!label) {
      return {
        tone: "error",
        locallyVisible: false,
        message: `“${name}”: vul een zichtbare naam in. Zonder naam wordt deze eigen URL niet betrouwbaar getoond. Zichtbaar op de lokale website: nee.`,
      };
    }
    if (!isSafeOwnUrl(href)) {
      return {
        tone: "error",
        locallyVisible: false,
        message: `“${name}”: “${href}” is geen geldige URL. Gebruik bijvoorbeeld /pagina of https://…. Zichtbaar op de lokale website: nee.`,
      };
    }
    return {
      tone: "ok",
      locallyVisible: true,
      message: `“${name}”: deze link kan op de website worden weergegeven (eigen URL: ${href}). Opgeslagen in Strapi na Opslaan; zichtbaar op de lokale website na een geslaagde verversing.`,
    };
  }

  if (key) {
    const page = pageByKey(key, pages);
    if (!page) {
      return {
        tone: "warn",
        locallyVisible: false,
        message: `“${name}”: de pagina “${catalog || key}” is lokaal niet gevonden. Opgeslagen in Strapi: de bestaande verwijzing blijft behouden (mogelijk wel aanwezig op live). Zichtbaar op de lokale website: nee. Kies een lokale pagina of een eigen URL, of publiceer/importeer de ontbrekende pagina.`,
      };
    }
    const pageName = (page.navLabel || page.title || key).trim();
    if (!isLocallyRoutableVisibility(page.visibility)) {
      return {
        tone: "warn",
        locallyVisible: false,
        message: `“${name}”: pagina “${pageName}” is nog niet gepubliceerd en wordt daarom niet als link op de lokale website weergegeven (status: ${page.visibility || "onbekend"}). Opgeslagen in Strapi: ja (verwijzing blijft). Zichtbaar op de lokale website: nee. Publiceer de pagina of kies een andere bestemming — we maken planned-pagina’s niet automatisch openbaar.`,
      };
    }
    return {
      tone: "ok",
      locallyVisible: true,
      message: `“${name}”: deze link kan op de website worden weergegeven (pagina: ${pageName}). Opgeslagen in Strapi na Opslaan; zichtbaar op de lokale website na een geslaagde verversing.`,
    };
  }

  if (!isPersistedLink(link)) {
    return {
      tone: "error",
      locallyVisible: false,
      message: `“${name}”: deze link heeft geen bestemming en wordt daarom niet weergegeven. Kies een pagina of vul een geldige URL in — opslaan wordt geblokkeerd tot dit is ingevuld.`,
    };
  }
  return {
    tone: "warn",
    locallyVisible: false,
    message: `“${name}”: deze link heeft geen bestemming en wordt daarom niet weergegeven. Opgeslagen in Strapi: de bestaande rij blijft staan. Zichtbaar op de lokale website: nee. Kies een pagina of URL om dit te herstellen.`,
  };
}

export function linkVisibilityMessage(link: NavPageLink, pages: MenuPageOption[] = []) {
  return linkVisibilityStatus(link, pages).message;
}

/** First non-empty link in a group is emphasized (white/bold) on the public site. */
function isEmphasizedLinkInGroup(links: NavPageLink[], linkIndex: number) {
  const first = links.findIndex((link) => !isEmptyLink(link));
  return first >= 0 && first === linkIndex;
}

function selectionKey(selection: Selection | null) {
  if (!selection) return "";
  if (selection.kind === "item") return `item:${selection.itemIndex}`;
  if (selection.kind === "intro") return `intro:${selection.itemIndex}`;
  if (selection.kind === "feature") return `feature:${selection.itemIndex}`;
  if (selection.kind === "column") return `col:${selection.itemIndex}:${selection.columnIndex}`;
  if (selection.kind === "group") return `grp:${selection.itemIndex}:${selection.columnIndex}:${selection.groupIndex}`;
  if (selection.kind === "megaLink") {
    return `ml:${selection.itemIndex}:${selection.columnIndex}:${selection.groupIndex}:${selection.linkIndex}`;
  }
  return `dl:${selection.itemIndex}:${selection.linkIndex}`;
}

/** Overview CTA text/URL is still hardcoded in the frontend for known menu ids. */
function overviewFromMenuId(menuId?: string) {
  const id = String(menuId ?? "").trim().toLowerCase();
  if (id === "online-marketing") {
    return { label: "Alle online marketing diensten", href: "/online-marketing" };
  }
  if (id === "websites") {
    return { label: "Alle websitediensten", href: "/websites" };
  }
  return null;
}

function groupDisplayName(group: { links?: NavPageLink[] }, groupIndex: number, pages: MenuPageOption[] = []) {
  const first = (group.links ?? []).find((link) => !isEmptyLink(link));
  const base = `Groep ${groupIndex + 1}`;
  if (!first) return base;
  return `${base} · ${linkDisplayName(first, pages)}`;
}

function columnHasResolvableLinks(column: NavColumn) {
  return (column.groups ?? []).some((group) =>
    (group.links ?? []).some((link) => {
      if (isEmptyLink(link)) return false;
      return Boolean((link.href ?? "").trim() || pageRef(link));
    }),
  );
}

const menuTheme = {
  shell: "#161625",
  panel: "#1c1c2e",
  card: "#24243a",
  cardBorder: "#35354d",
  text: "#ececf4",
  muted: "#9b9bb3",
  accent: "#7c5dfa",
  accentSoft: "rgba(124, 93, 250, 0.18)",
  row: "transparent",
  rowHover: "rgba(255,255,255,0.04)",
  line: "#3a3a55",
};

function PreviewCard({ title, lines }: { title: string; lines: string[] }) {
  const visible = lines.map((line) => line.trim()).filter(Boolean);
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: menuTheme.card,
        border: `1px solid ${menuTheme.cardBorder}`,
        color: menuTheme.text,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: menuTheme.muted, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        Voorbeeld op de website
      </div>
      <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700 }}>{title}</div>
      {visible.map((line) => (
        <div key={`${title}-${line}`} style={{ marginTop: 6, fontSize: 13, color: menuTheme.muted, lineHeight: 1.45 }}>
          {line}
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: menuTheme.card,
        border: `1px solid ${menuTheme.cardBorder}`,
        color: menuTheme.text,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: menuTheme.text }}>{title}</div>
      {hint ? <div style={{ marginTop: 6, fontSize: 13, color: menuTheme.muted, lineHeight: 1.45 }}>{hint}</div> : null}
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

function DetailHero({ path, title, subtitle, icon = "◆" }: { path: string; title: string; subtitle: string; icon?: string }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: menuTheme.accentSoft,
        border: `1px solid rgba(124, 93, 250, 0.45)`,
        color: menuTheme.text,
      }}
    >
      {path ? <div style={{ fontSize: 13, color: menuTheme.muted }}>{path}</div> : null}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginTop: path ? 10 : 0, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 12, minWidth: 0, flex: 1 }}>
          <div
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: menuTheme.card,
              border: `1px solid ${menuTheme.cardBorder}`,
              display: "grid",
              placeItems: "center",
              color: menuTheme.accent,
              flex: "0 0 40px",
              fontSize: 16,
            }}
          >
            {icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>{title}</div>
            <div style={{ marginTop: 4, fontSize: 13, color: menuTheme.muted, lineHeight: 1.45 }}>{subtitle}</div>
          </div>
        </div>
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background: menuTheme.accent,
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          ✓ Geselecteerd
        </div>
      </div>
    </div>
  );
}

function TreeIcon({ kind }: { kind: "mega" | "folder" | "link" | "intro" | "feature" | "item" }) {
  const map = {
    mega: "▤",
    folder: "▣",
    link: "☍",
    intro: "⌂",
    feature: "✦",
    item: "●",
  } as const;
  return (
    <span aria-hidden="true" style={{ width: 18, textAlign: "center", color: menuTheme.muted, flex: "0 0 18px", fontSize: 13 }}>
      {map[kind]}
    </span>
  );
}

function emptyLink(): NavPageLink {
  return { label: "", page: { entryKey: "" }, href: "" };
}

function emptyGroup() {
  return { links: [] as NavPageLink[] };
}

function emptyColumn(): NavColumn {
  return { label: "Nieuwe categorie", groups: [emptyGroup()] };
}

function textField(name: string, label: string, value: string, onChange: (value: string) => void, hint?: string) {
  return (
    <Field.Root name={name}>
      <Field.Label>{label}</Field.Label>
      <TextInput name={name} value={value} onChange={(event) => onChange(event.target.value)} />
      {hint ? (
        <Box paddingTop={1}>
          <Typography variant="pi" textColor="neutral600">
            {hint}
          </Typography>
        </Box>
      ) : null}
    </Field.Root>
  );
}

function TreeRow({
  label,
  selected,
  depth,
  onClick,
  badge,
  icon,
  expandable,
  open,
  onToggle,
}: {
  label: string;
  selected: boolean;
  depth: number;
  onClick: () => void;
  badge?: string;
  icon: "mega" | "folder" | "link" | "intro" | "feature" | "item";
  expandable?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        marginLeft: depth > 0 ? 12 : 0,
        paddingLeft: depth > 0 ? 14 : 0,
        borderLeft: depth > 0 ? `1px solid ${menuTheme.line}` : "none",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        aria-current={selected ? "true" : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          textAlign: "left",
          border: selected ? `1px solid ${menuTheme.accent}` : "1px solid transparent",
          borderRadius: 10,
          padding: "9px 10px",
          cursor: "pointer",
          background: selected ? menuTheme.accentSoft : menuTheme.row,
          color: menuTheme.text,
          font: "inherit",
          fontWeight: selected ? 600 : 500,
          fontSize: 14.5,
          lineHeight: 1.35,
          minHeight: 42,
        }}
        onMouseEnter={(event) => {
          if (!selected) event.currentTarget.style.background = menuTheme.rowHover;
        }}
        onMouseLeave={(event) => {
          if (!selected) event.currentTarget.style.background = menuTheme.row;
        }}
      >
        {expandable ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={open ? "Inklappen" : "Uitklappen"}
            aria-expanded={open}
            onClick={(event) => {
              event.stopPropagation();
              onToggle?.();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onToggle?.();
              }
            }}
            style={{
              width: 18,
              height: 18,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: menuTheme.muted,
              transform: open ? "rotate(90deg)" : "none",
              transition: "transform 120ms ease",
              flex: "0 0 18px",
              fontSize: 12,
            }}
          >
            ▸
          </span>
        ) : (
          <span style={{ width: 18, flex: "0 0 18px" }} />
        )}
        <TreeIcon kind={icon} />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        {badge ? (
          <span style={{ fontSize: 11, fontWeight: 600, color: selected ? menuTheme.accent : menuTheme.muted, whiteSpace: "nowrap" }}>
            {badge}
          </span>
        ) : null}
      </button>
    </div>
  );
}

function AddChooser({
  depth,
  contextLabel,
  options,
}: {
  depth: number;
  contextLabel: string;
  options: { id: string; label: string; hint: string; onClick: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginLeft: depth > 0 ? 12 : 0, paddingLeft: depth > 0 ? 14 : 0, borderLeft: depth > 0 ? `1px solid ${menuTheme.line}` : "none" }}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            width: "100%",
            textAlign: "left",
            border: "1px dashed #45455f",
            borderRadius: 10,
            padding: "8px 12px",
            marginTop: 4,
            marginBottom: 4,
            background: "transparent",
            color: menuTheme.muted,
            cursor: "pointer",
            font: "inherit",
            fontSize: 13,
            fontWeight: 600,
            minHeight: 36,
          }}
        >
          + Onderdeel toevoegen
        </button>
      ) : (
        <div
          style={{
            marginTop: 6,
            marginBottom: 8,
            padding: 12,
            borderRadius: 12,
            border: `1px solid ${menuTheme.cardBorder}`,
            background: menuTheme.card,
          }}
        >
          <div style={{ fontSize: 13, color: menuTheme.muted, lineHeight: 1.4 }}>
            Je voegt een onderdeel toe onder <strong style={{ color: menuTheme.text }}>{contextLabel}</strong>.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  option.onClick();
                  setOpen(false);
                }}
                style={{
                  textAlign: "left",
                  border: `1px solid ${menuTheme.cardBorder}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  background: menuTheme.panel,
                  color: menuTheme.text,
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{option.label}</div>
                <div style={{ marginTop: 4, fontSize: 12, color: menuTheme.muted, lineHeight: 1.4 }}>{option.hint}</div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              marginTop: 10,
              border: "none",
              background: "transparent",
              color: menuTheme.muted,
              cursor: "pointer",
              font: "inherit",
              fontSize: 12,
            }}
          >
            Annuleren
          </button>
        </div>
      )}
    </div>
  );
}

function StatusBanner({ tone, children }: { tone: "ok" | "warn" | "error"; children: ReactNode }) {
  const styles =
    tone === "ok"
      ? { bg: "rgba(52, 199, 89, 0.12)", border: "rgba(52, 199, 89, 0.35)" }
      : tone === "warn"
        ? { bg: "rgba(255, 186, 0, 0.12)", border: "rgba(255, 186, 0, 0.35)" }
        : { bg: "rgba(255, 80, 80, 0.12)", border: "rgba(255, 80, 80, 0.4)" };
  return (
    <div
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 10,
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        color: menuTheme.text,
        fontSize: 13,
        lineHeight: 1.45,
      }}
    >
      {children}
    </div>
  );
}

type MenuSection = "utility" | "main" | "contact";

type Props = {
  items: NavItemRow[];
  onChange: (items: NavItemRow[]) => void;
  phoneDisplay?: string;
  onPhoneChange?: (value: string) => void;
  pages?: MenuPageOption[];
  hasUnsavedChanges?: boolean;
};

export function MenuEditor({
  items,
  onChange,
  phoneDisplay = "",
  onPhoneChange,
  pages = [],
  hasUnsavedChanges = false,
}: Props) {
  const [section, setSection] = useState<MenuSection>("main");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pendingDelete, setPendingDelete] = useState<{ title: string; detail?: string; run: () => void } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const selectedKey = selectionKey(selection);

  const selectedItem = useMemo(() => {
    if (!selection) return null;
    return items[selection.itemIndex] ?? null;
  }, [items, selection]);

  function updateItems(next: NavItemRow[]) {
    onChange(next);
  }

  function updateItem(itemIndex: number, next: NavItemRow) {
    const copy = [...items];
    copy[itemIndex] = next;
    updateItems(copy);
  }

  function moveInArray<T>(list: T[], index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= list.length) return list;
    const copy = [...list];
    const [row] = copy.splice(index, 1);
    copy.splice(target, 0, row);
    return copy;
  }

  function isExpanded(key: string) {
    return expanded[key] ?? false;
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !(prev[key] ?? false) }));
  }

  function selectNode(next: Selection) {
    setPendingDelete(null);
    setSelection(next);
    const keys: string[] = [];
    if (next.kind !== "item") keys.push(`item:${next.itemIndex}`);
    if (next.kind === "column" || next.kind === "group" || next.kind === "megaLink") {
      keys.push(`item:${next.itemIndex}:col:${next.columnIndex}`);
    }
    if (next.kind === "group" || next.kind === "megaLink") {
      keys.push(`item:${next.itemIndex}:col:${next.columnIndex}:grp:${next.groupIndex}`);
    }
    if (keys.length) {
      setExpanded((prev) => {
        const copy = { ...prev };
        for (const key of keys) copy[key] = true;
        return copy;
      });
    }
  }

  function askDelete(title: string, run: () => void, detail?: string) {
    setPendingDelete({ title, detail, run });
  }

  function addTopLevel(kind: "nav.link" | "nav.dropdown" | "nav.mega") {
    const nextItem: NavItemRow =
      kind === "nav.link"
        ? {
            __component: "nav.link",
            label: "Nieuwe link",
            placement: section === "utility" ? "utility" : "main",
            page: { entryKey: "" },
            href: "",
          }
        : kind === "nav.dropdown"
          ? { __component: "nav.dropdown", label: "Nieuw submenu", links: [] }
          : {
              __component: "nav.mega",
              menuId: "nieuw-menu",
              label: "Nieuw menu",
              description: "",
              columns: [emptyColumn()],
            };
    const next = [...items, nextItem];
    updateItems(next);
    selectNode({ kind: "item", itemIndex: next.length - 1 });
  }

  function pathLabel() {
    if (!selection || !selectedItem) return "";
    const parts = [displayName(selectedItem)];
    if (selection.kind === "intro") parts.push("Introductie");
    if (selection.kind === "feature") parts.push("Uitgelicht blok");
    if (selection.kind === "column" || selection.kind === "group" || selection.kind === "megaLink") {
      const column = selectedItem.columns?.[selection.columnIndex];
      parts.push((column?.label ?? "").trim() || `Categorie ${selection.columnIndex + 1}`);
    }
    if (selection.kind === "group" || selection.kind === "megaLink") {
      const group = selectedItem.columns?.[selection.columnIndex]?.groups?.[selection.groupIndex];
      if (selection.kind === "group" || (group && (selectedItem.columns?.[selection.columnIndex]?.groups?.length ?? 0) > 1)) {
        parts.push(group ? groupDisplayName(group, selection.groupIndex, pages) : `Groep ${selection.groupIndex + 1}`);
      }
    }
    if (selection.kind === "megaLink") {
      const link = selectedItem.columns?.[selection.columnIndex]?.groups?.[selection.groupIndex]?.links?.[selection.linkIndex];
      if (link) parts.push(linkDisplayName(link, pages));
    }
    if (selection.kind === "dropdownLink") {
      const link = selectedItem.links?.[selection.linkIndex];
      if (link) parts.push(linkDisplayName(link, pages));
    }
    return parts.join(" → ");
  }

  function addGroupUnderColumn(itemIndex: number, columnIndex: number) {
    const item = items[itemIndex];
    if (!item || item.__component !== "nav.mega") return;
    const columns = [...(item.columns ?? [])];
    const column = columns[columnIndex];
    if (!column) return;
    const groups = [...(column.groups ?? []), emptyGroup()];
    columns[columnIndex] = { ...column, groups };
    updateItem(itemIndex, { ...item, columns });
    selectNode({ kind: "group", itemIndex, columnIndex, groupIndex: groups.length - 1 });
  }

  function visibleTopIndexes() {
    return items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => (section === "utility" ? isUtilityItem(item) : isMainItem(item)))
      .map(({ index }) => index);
  }

  function addLinkUnderColumn(itemIndex: number, columnIndex: number, groupIndex = 0) {
    const item = items[itemIndex];
    if (!item || item.__component !== "nav.mega") return;
    const columns = [...(item.columns ?? [])];
    const column = columns[columnIndex];
    if (!column) return;
    const groups = column.groups?.length ? [...column.groups] : [emptyGroup()];
    const target = Math.min(Math.max(groupIndex, 0), groups.length - 1);
    const links = [...(groups[target].links ?? []), emptyLink()];
    groups[target] = { ...groups[target], links };
    columns[columnIndex] = { ...column, groups };
    updateItem(itemIndex, { ...item, columns });
    selectNode({ kind: "megaLink", itemIndex, columnIndex, groupIndex: target, linkIndex: links.length - 1 });
  }

  function renderTree() {
    const indexes = visibleTopIndexes();
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {indexes.length === 0 ? (
          <div style={{ padding: 12, borderRadius: 10, background: menuTheme.card, color: menuTheme.muted, fontSize: 13 }}>
            {section === "utility"
              ? "Nog geen links in de bovenste balk. Voeg een link of submenu toe."
              : "Nog geen hoofdmenu-items. Voeg een dropdown-menu of link toe."}
          </div>
        ) : null}
        {indexes.map((itemIndex) => {
          const item = items[itemIndex];
          const itemKey = `item:${itemIndex}`;
          const itemSelected = selectedKey === selectionKey({ kind: "item", itemIndex });
          const open = isExpanded(itemKey);
          const expandable = item.__component === "nav.mega" || item.__component === "nav.dropdown";
          return (
            <div key={itemKey}>
              <TreeRow
                label={displayName(item)}
                selected={itemSelected}
                depth={0}
                badge={kindLabel(item.__component)}
                icon={item.__component === "nav.mega" ? "mega" : item.__component === "nav.dropdown" ? "folder" : "link"}
                expandable={expandable}
                open={open}
                onToggle={() => toggleExpanded(itemKey)}
                onClick={() => selectNode({ kind: "item", itemIndex })}
              />
              {open && item.__component === "nav.dropdown" ? (
                <div>
                  {(() => {
                    const links = item.links ?? [];
                    const visible = links
                      .map((link, linkIndex) => ({ link, linkIndex }))
                      .filter(({ link }) => !isEmptyLink(link));
                    if (visible.length === 0) {
                      return (
                        <div style={{ padding: "8px 12px 4px 28px", color: menuTheme.muted, fontSize: 13 }}>Nog geen links</div>
                      );
                    }
                    return visible.map(({ link, linkIndex }) => (
                      <TreeRow
                        key={`${itemKey}:link:${linkIndex}`}
                        label={linkDisplayName(link, pages)}
                        selected={selectedKey === selectionKey({ kind: "dropdownLink", itemIndex, linkIndex })}
                        depth={1}
                        icon="link"
                        onClick={() => selectNode({ kind: "dropdownLink", itemIndex, linkIndex })}
                      />
                    ));
                  })()}
                  <AddChooser
                    depth={1}
                    contextLabel={displayName(item)}
                    options={[
                      {
                        id: "link",
                        label: "Klikbare link toevoegen",
                        hint: "Nieuwe link in dit submenu. Kies daarna een pagina of URL — zonder bestemming verschijnt de link niet.",
                        onClick: () => {
                          const links = [...(item.links ?? []), emptyLink()];
                          updateItem(itemIndex, { ...item, links });
                          selectNode({ kind: "dropdownLink", itemIndex, linkIndex: links.length - 1 });
                        },
                      },
                    ]}
                  />
                </div>
              ) : null}
              {open && item.__component === "nav.mega" ? (
                <div>
                  <TreeRow
                    label="Introductie"
                    selected={selectedKey === selectionKey({ kind: "intro", itemIndex })}
                    depth={1}
                    icon="intro"
                    onClick={() => selectNode({ kind: "intro", itemIndex })}
                  />
                  {(item.columns ?? []).map((column, columnIndex) => {
                    const colKey = `${itemKey}:col:${columnIndex}`;
                    const colOpen = isExpanded(colKey);
                    const groups = column.groups?.length ? column.groups : [emptyGroup()];
                    const colLabel = (column.label ?? "").trim() || `Categorie ${columnIndex + 1}`;
                    return (
                      <div key={colKey}>
                        <TreeRow
                          label={colLabel}
                          selected={selectedKey === selectionKey({ kind: "column", itemIndex, columnIndex })}
                          depth={1}
                          icon="folder"
                          badge="categorie"
                          expandable
                          open={colOpen}
                          onToggle={() => toggleExpanded(colKey)}
                          onClick={() => selectNode({ kind: "column", itemIndex, columnIndex })}
                        />
                        {colOpen ? (
                          <div>
                            {groups.map((group, groupIndex) => {
                              const links = group.links ?? [];
                              const grpKey = `${colKey}:grp:${groupIndex}`;
                              const grpOpen = isExpanded(grpKey);
                              const visible = links
                                .map((link, linkIndex) => ({ link, linkIndex }))
                                .filter(({ link }) => !isEmptyLink(link));
                              return (
                                <div key={grpKey}>
                                  <TreeRow
                                    label={groupDisplayName(group, groupIndex, pages)}
                                    selected={
                                      selectedKey === selectionKey({ kind: "group", itemIndex, columnIndex, groupIndex })
                                    }
                                    depth={2}
                                    icon="folder"
                                    badge="groep"
                                    expandable
                                    open={grpOpen}
                                    onToggle={() => toggleExpanded(grpKey)}
                                    onClick={() => selectNode({ kind: "group", itemIndex, columnIndex, groupIndex })}
                                  />
                                  {grpOpen ? (
                                    <div>
                                      {visible.length === 0 ? (
                                        <div style={{ padding: "6px 12px 2px 52px", color: menuTheme.muted, fontSize: 13 }}>
                                          Nog geen links in deze groep
                                        </div>
                                      ) : null}
                                      {visible.map(({ link, linkIndex }) => (
                                        <TreeRow
                                          key={`${grpKey}:link:${linkIndex}`}
                                          label={linkDisplayName(link, pages)}
                                          selected={
                                            selectedKey ===
                                            selectionKey({
                                              kind: "megaLink",
                                              itemIndex,
                                              columnIndex,
                                              groupIndex,
                                              linkIndex,
                                            })
                                          }
                                          depth={3}
                                          icon="link"
                                          badge={isEmphasizedLinkInGroup(links, linkIndex) ? "nadruk" : "aanvullend"}
                                          onClick={() =>
                                            selectNode({
                                              kind: "megaLink",
                                              itemIndex,
                                              columnIndex,
                                              groupIndex,
                                              linkIndex,
                                            })
                                          }
                                        />
                                      ))}
                                      <AddChooser
                                        depth={3}
                                        contextLabel={groupDisplayName(group, groupIndex, pages)}
                                        options={[
                                          {
                                            id: "link",
                                            label: "Link aan deze groep toevoegen",
                                            hint: "Nieuwe klikbare link in deze groep. De eerste link wordt op de website wit en dik weergegeven; volgende links meestal grijs.",
                                            onClick: () => addLinkUnderColumn(itemIndex, columnIndex, groupIndex),
                                          },
                                        ]}
                                      />
                                      {groupIndex === groups.length - 1 ? (
                                        <AddChooser
                                          depth={2}
                                          contextLabel={colLabel}
                                          options={[
                                            {
                                              id: "group",
                                              label: "Nieuwe groep toevoegen",
                                              hint: "Maakt een aparte groep in deze categorie. De eerste link van die nieuwe groep krijgt opnieuw nadruk (wit/dik).",
                                              onClick: () => addGroupUnderColumn(itemIndex, columnIndex),
                                            },
                                          ]}
                                        />
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  <AddChooser
                    depth={1}
                    contextLabel={displayName(item)}
                    options={[
                      {
                        id: "column",
                        label: "Nieuwe categorie toevoegen",
                        hint: "Maakt een nieuwe kolom in dit dropdownmenu (bijvoorbeeld Vindbaarheid of Adverteren).",
                        onClick: () => {
                          const columns = [...(item.columns ?? []), emptyColumn()];
                          updateItem(itemIndex, { ...item, columns });
                          setSelection({ kind: "column", itemIndex, columnIndex: columns.length - 1 });
                          setExpanded((prev) => ({ ...prev, [itemKey]: true, [`${itemKey}:col:${columns.length - 1}`]: true }));
                        },
                      },
                    ]}
                  />
                  <TreeRow
                    label={(item.feature?.title ?? "").trim() ? "Uitgelicht blok" : "Uitgelicht blok (leeg)"}
                    selected={selectedKey === selectionKey({ kind: "feature", itemIndex })}
                    depth={1}
                    icon="feature"
                    onClick={() => selectNode({ kind: "feature", itemIndex })}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  function moveControls(disabledUp: boolean, disabledDown: boolean, onUp: () => void, onDown: () => void) {
    return (
      <Flex gap={2} wrap="wrap">
        <Button type="button" variant="tertiary" disabled={disabledUp} onClick={onUp}>
          ↑ Omhoog
        </Button>
        <Button type="button" variant="tertiary" disabled={disabledDown} onClick={onDown}>
          ↓ Omlaag
        </Button>
      </Flex>
    );
  }

  function renderDetail() {
    if (!selection || !selectedItem) {
      return (
        <div
          style={{
            padding: 20,
            borderRadius: 12,
            background: menuTheme.card,
            border: `1px solid ${menuTheme.cardBorder}`,
            color: menuTheme.text,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700 }}>Kies een onderdeel</div>
          <div style={{ marginTop: 8, fontSize: 14, color: menuTheme.muted, lineHeight: 1.45 }}>
            Selecteer links iets uit de menu-indeling. Rechts verschijnen dan alleen de velden die bij dat onderdeel
            horen — zoals op de website.
          </div>
        </div>
      );
    }

    if (pendingDelete) {
      return (
        <Box padding={4} background="danger100" hasRadius>
          <Typography variant="delta" tag="h3">
            Verwijderen?
          </Typography>
          <Box paddingTop={2}>
            <Typography variant="pi">{pendingDelete.title}</Typography>
          </Box>
          {pendingDelete.detail ? (
            <Box paddingTop={2}>
              <Typography variant="pi" textColor="neutral700">
                {pendingDelete.detail}
              </Typography>
            </Box>
          ) : null}
          <Flex gap={2} paddingTop={4}>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                pendingDelete.run();
                setPendingDelete(null);
              }}
            >
              Ja, verwijderen
            </Button>
            <Button type="button" variant="tertiary" onClick={() => setPendingDelete(null)}>
              Annuleren
            </Button>
          </Flex>
        </Box>
      );
    }

    const item = selectedItem;
    const itemIndex = selection.itemIndex;

    if (selection.kind === "item") {
      const placeHint =
        item.__component === "nav.mega"
          ? "Dropdown in het hoofdmenu (desktop en mobiel)."
          : item.__component === "nav.dropdown"
            ? "Submenu in de bovenste balk (bijvoorbeeld Over ons)."
            : item.placement === "utility"
              ? "Link in de bovenste balk."
              : "Link in het hoofdmenu.";
      return (
        <Flex direction="column" alignItems="stretch" gap={3}>
          <DetailHero path={pathLabel()} title={displayName(item)} subtitle={placeHint} />
          <SectionCard title="Naam wijzigen" hint="Dit is de tekst die bezoekers in de header zien.">
            {textField("item-label", "Naam in het hoofdmenu", item.label ?? "", (value) => updateItem(itemIndex, { ...item, label: value }))}
          </SectionCard>
          {item.__component === "nav.link" ? (
            (() => {
              const asLink: NavPageLink = { label: item.label, href: item.href, page: item.page };
              const destMode: "page" | "url" = (item.href ?? "").trim() ? "url" : "page";
              const visibility = linkVisibilityStatus(asLink, pages);
              return (
                <>
                  <SectionCard title="Bestemming" hint="Waar moet deze link naartoe als iemand erop klikt?">
                    <Flex gap={2} wrap="wrap" paddingBottom={2}>
                      <Button
                        type="button"
                        size="S"
                        variant={destMode === "page" ? "default" : "tertiary"}
                        onClick={() => updateItem(itemIndex, { ...item, href: "" })}
                      >
                        Bestaande pagina
                      </Button>
                      <Button
                        type="button"
                        size="S"
                        variant={destMode === "url" ? "default" : "tertiary"}
                        onClick={() =>
                          updateItem(itemIndex, {
                            ...item,
                            page: { entryKey: "" },
                            href: item.href || "/",
                          })
                        }
                      >
                        Eigen URL
                      </Button>
                    </Flex>
                    {destMode === "page" ? (
                      <Field.Root name="item-page">
                        <Field.Label>Kies een pagina</Field.Label>
                        <Box paddingTop={1}>
                          <select
                            aria-label="Kies een pagina"
                            value={item.page?.entryKey ?? ""}
                            onChange={(event) => {
                              const entryKey = event.target.value;
                              const match = pages.find((page) => page.entryKey === entryKey);
                              const nextLabel =
                                (item.label ?? "").trim() ||
                                (match?.navLabel ?? "").trim() ||
                                (match?.title ?? "").trim() ||
                                item.label ||
                                "";
                              updateItem(itemIndex, {
                                ...item,
                                href: "",
                                label: nextLabel,
                                page: {
                                  entryKey,
                                  documentId: match?.documentId,
                                  title: match?.title,
                                  navLabel: match?.navLabel,
                                },
                              });
                            }}
                            style={{ width: "100%", minHeight: 40, padding: "0 12px", borderRadius: 8 }}
                          >
                            <option value="">— Kies een pagina —</option>
                            {pages
                              .filter((page) => page.entryKey)
                              .map((page) => (
                                <option key={page.entryKey} value={page.entryKey}>
                                  {pageOptionLabel(page)}
                                </option>
                              ))}
                          </select>
                        </Box>
                      </Field.Root>
                    ) : (
                      textField(
                        "item-href",
                        "Eigen URL",
                        item.href ?? "",
                        (value) => updateItem(itemIndex, { ...item, href: value, page: { entryKey: "" } }),
                        "Bijvoorbeeld /contact of https://voorbeeld.nl",
                      )
                    )}
                    <StatusBanner tone={visibility.tone}>{visibility.message}</StatusBanner>
                  </SectionCard>
                  <SectionCard title="Plaatsing">
                    <Field.Root name="item-placement">
                      <Field.Label>Zichtbaar in</Field.Label>
                      <Box paddingTop={1}>
                        <select
                          aria-label="Zichtbaar in"
                          value={item.placement === "utility" ? "utility" : "main"}
                          onChange={(event) =>
                            updateItem(itemIndex, {
                              ...item,
                              placement: event.target.value === "utility" ? "utility" : "main",
                            })
                          }
                          style={{ width: "100%", minHeight: 40, padding: "0 12px", borderRadius: 8 }}
                        >
                          <option value="main">Hoofdmenu</option>
                          <option value="utility">Bovenste balk</option>
                        </select>
                      </Box>
                    </Field.Root>
                  </SectionCard>
                </>
              );
            })()
          ) : null}
          {item.__component === "nav.mega" ? (
            <SectionCard title="Onderdelen in deze dropdown" hint="Open een onderdeel in de indeling links, of spring direct door.">
              <Flex gap={2} wrap="wrap">
                <Button type="button" variant="secondary" size="S" onClick={() => selectNode({ kind: "intro", itemIndex })}>
                  Introductie
                </Button>
                <Button type="button" variant="secondary" size="S" onClick={() => selectNode({ kind: "feature", itemIndex })}>
                  Uitgelicht blok
                </Button>
                <Button
                  type="button"
                  variant="tertiary"
                  size="S"
                  startIcon={<Plus />}
                  onClick={() => {
                    const columns = [...(item.columns ?? []), emptyColumn()];
                    updateItem(itemIndex, { ...item, columns });
                    setSelection({ kind: "column", itemIndex, columnIndex: columns.length - 1 });
                  }}
                >
                  Categorie toevoegen
                </Button>
              </Flex>
              <Box paddingTop={3}>
                <Button type="button" variant="tertiary" size="S" onClick={() => setShowAdvanced((value) => !value)}>
                  {showAdvanced ? "Technische opties verbergen" : "Technische opties tonen"}
                </Button>
                {showAdvanced ? (
                  <Box paddingTop={2}>
                    {textField(
                      "item-menu-id",
                      "Technische id (niet wijzigen zonder reden)",
                      item.menuId ?? "",
                      (value) => updateItem(itemIndex, { ...item, menuId: value }),
                      "Alleen voor websitekoppeling. Foutieve wijziging kan het menu breken.",
                    )}
                  </Box>
                ) : null}
              </Box>
            </SectionCard>
          ) : null}

          <SectionCard title="Volgorde" hint="Verplaats dit onderdeel binnen hetzelfde niveau.">
            {moveControls(
              itemIndex === 0,
              itemIndex >= items.length - 1,
              () => {
                updateItems(moveInArray(items, itemIndex, -1));
                setSelection({ kind: "item", itemIndex: itemIndex - 1 });
              },
              () => {
                updateItems(moveInArray(items, itemIndex, 1));
                setSelection({ kind: "item", itemIndex: itemIndex + 1 });
              },
            )}
          </SectionCard>

          <Flex gap={2} wrap="wrap">
            {item.__component === "nav.dropdown" ? (
              <Button
                type="button"
                variant="secondary"
                startIcon={<Plus />}
                onClick={() => {
                  const links = [...(item.links ?? []), emptyLink()];
                  updateItem(itemIndex, { ...item, links });
                  setSelection({ kind: "dropdownLink", itemIndex, linkIndex: links.length - 1 });
                }}
              >
                Link toevoegen
              </Button>
            ) : null}
            <Button
              type="button"
              variant="danger-light"
              onClick={() =>
                askDelete(
                  `Verwijder “${displayName(item)}” uit het menu?`,
                  () => {
                    updateItems(items.filter((_, index) => index !== itemIndex));
                    setSelection(null);
                  },
                  item.__component === "nav.mega" || item.__component === "nav.dropdown"
                    ? "Alle onderliggende categorieën, groepen en links verdwijnen ook."
                    : undefined,
                )
              }
            >
              Verwijderen
            </Button>
          </Flex>
        </Flex>
      );
    }

    if (selection.kind === "intro" && item.__component === "nav.mega") {
      const overview = overviewFromMenuId(item.menuId);
      return (
        <Flex direction="column" alignItems="stretch" gap={3}>
          <DetailHero
            path={pathLabel()}
            title="Introductie"
            subtitle="Linker kolom in de dropdown: titel, beschrijving en eventuele overzichtslink."
          />
          <PreviewCard
            title={displayName(item)}
            lines={[item.description ?? "", overview ? `${overview.label} → ${overview.href}` : ""]}
          />
          <SectionCard title="Teksten">
            <Flex direction="column" alignItems="stretch" gap={3}>
              {textField(
                "intro-label",
                "Naam in het hoofdmenu / titel in de dropdown",
                item.label ?? "",
                (value) => updateItem(itemIndex, { ...item, label: value }),
              )}
              {textField(
                "intro-desc",
                "Beschrijving links in de dropdown",
                item.description ?? "",
                (value) => updateItem(itemIndex, { ...item, description: value }),
                "Bijvoorbeeld: Alles om online gevonden te worden, te verkopen en te groeien.",
              )}
            </Flex>
          </SectionCard>
          <SectionCard title="Overzichtslink" hint="Nog vast in de frontend; hier zie je wat bezoekers nu krijgen.">
            {overview ? (
              <Typography variant="pi" textColor="neutral600">
                Nu op de website: “{overview.label}” → {overview.href}. Bewerkbaar maken vereist een aparte
                CMS-uitbreiding.
              </Typography>
            ) : (
              <Typography variant="pi" textColor="neutral600">
                Voor dit menu is er geen vaste overzichtslink in de frontend.
              </Typography>
            )}
          </SectionCard>
        </Flex>
      );
    }

    if (selection.kind === "feature" && item.__component === "nav.mega") {
      const feature = item.feature ?? {};
      const hasContent = Boolean(
        (feature.title ?? "").trim() || (feature.body ?? "").trim() || (feature.href ?? "").trim() || (feature.cta ?? "").trim(),
      );
      return (
        <Flex direction="column" alignItems="stretch" gap={3}>
          <DetailHero
            path={pathLabel()}
            title="Uitgelicht blok"
            subtitle="Oranje kader onderaan de dropdown, zoals de websitescan of een cases-CTA."
          />
          <PreviewCard
            title={(feature.title ?? "").trim() || "Uitgelicht blok"}
            lines={[feature.body ?? "", feature.cta ? `${feature.cta} → ${feature.href || "…"}` : ""]}
          />
          <SectionCard title="Inhoud">
            <Flex direction="column" alignItems="stretch" gap={3}>
              {textField("feat-title", "Titel van het uitgelichte blok", feature.title ?? "", (value) =>
                updateItem(itemIndex, { ...item, feature: { ...feature, title: value } }),
              )}
              {textField("feat-body", "Beschrijving", feature.body ?? "", (value) =>
                updateItem(itemIndex, { ...item, feature: { ...feature, body: value } }),
              )}
              {textField("feat-cta", "Tekst van de knop", feature.cta ?? "", (value) =>
                updateItem(itemIndex, { ...item, feature: { ...feature, cta: value } }),
              )}
              {textField(
                "feat-href",
                "Waar gaat deze knop naartoe?",
                feature.href ?? "",
                (value) => updateItem(itemIndex, { ...item, feature: { ...feature, href: value } }),
                "Bijvoorbeeld /websites/scan of /cases.",
              )}
            </Flex>
          </SectionCard>
          {hasContent ? (
            <Button
              type="button"
              variant="danger-light"
              onClick={() =>
                askDelete(
                  `Uitgelicht blok van “${displayName(item)}” legen?`,
                  () => updateItem(itemIndex, { ...item, feature: undefined }),
                  "Titel, tekst, knop en link worden leeggemaakt. Opslaan bevestigt dit.",
                )
              }
            >
              Uitgelicht blok legen
            </Button>
          ) : (
            <Typography variant="pi" textColor="neutral500">
              Vul de velden in om een uitgelicht blok te tonen.
            </Typography>
          )}
        </Flex>
      );
    }

    if (selection.kind === "column" && item.__component === "nav.mega") {
      const column = item.columns?.[selection.columnIndex];
      if (!column) return null;
      const columns = item.columns ?? [];
      const columnIndex = selection.columnIndex;
      const groups = column.groups ?? [];
      return (
        <Flex direction="column" alignItems="stretch" gap={3}>
          <DetailHero
            path={pathLabel()}
            title={(column.label ?? "").trim() || `Categorie ${columnIndex + 1}`}
            subtitle={`Bewerk de instellingen voor deze categorie in “${displayName(item)}”.`}
          />
          <SectionCard title="Naam wijzigen">
            {textField("col-label", "Categorie boven de links", column.label ?? "", (value) => {
              const next = [...columns];
              next[columnIndex] = { ...column, label: value };
              updateItem(itemIndex, { ...item, columns: next });
            })}
          </SectionCard>
          <SectionCard
            title="Structuur"
            hint="Categorie = kolom in het dropdownmenu. Daaronder staan groepen met links."
          >
            <div style={{ fontSize: 13, color: menuTheme.muted, lineHeight: 1.45 }}>
              Onderdeel van dropdown “{displayName(item)}”. {groups.length} groep(en) in deze categorie.
            </div>
            <PreviewCard
              title="Zo ziet een categorie eruit"
              lines={[
                (column.label ?? "").trim() || "CATEGORIENAAM",
                "Groep 1 → eerste link wit/dik, volgende grijs",
                groups.length > 1 ? "Extra groep → opnieuw een witte nadruk-link" : "Voeg een groep toe voor een nieuwe nadruk-link",
              ]}
            />
            {!(column.label ?? "").trim() ? (
              <StatusBanner tone="warn">Vul een categorienaam in. Zonder naam verdwijnt een lege categorie van de website.</StatusBanner>
            ) : !columnHasResolvableLinks(column) ? (
              <StatusBanner tone="warn">
                Deze categorie bevat nog geen onderdelen. De titel kan na Opslaan wel zichtbaar zijn als lege kolom;
                bezoekers zien pas nuttige inhoud als je hieronder een klikbare link toevoegt.
              </StatusBanner>
            ) : (
              <StatusBanner tone="ok">Deze categorie is zichtbaar in de dropdown na Opslaan.</StatusBanner>
            )}
          </SectionCard>
          <SectionCard title="Onderdeel toevoegen" hint={`Je voegt een onderdeel toe onder “${(column.label ?? "").trim() || `Categorie ${columnIndex + 1}`}”.`}>
            <AddChooser
              depth={0}
              contextLabel={(column.label ?? "").trim() || `Categorie ${columnIndex + 1}`}
              options={[
                {
                  id: "link",
                  label: "Link aan deze groep toevoegen",
                  hint: "Voegt een klikbare link toe aan de laatste groep. Positie in de groep bepaalt of de link nadruk (wit) of aanvullend (grijs) krijgt.",
                  onClick: () => addLinkUnderColumn(itemIndex, columnIndex, Math.max(0, groups.length - 1)),
                },
                {
                  id: "group",
                  label: "Nieuwe groep toevoegen",
                  hint: "Maakt een aparte groep in deze categorie. De eerste link van die groep krijgt opnieuw nadruk op de website.",
                  onClick: () => addGroupUnderColumn(itemIndex, columnIndex),
                },
              ]}
            />
          </SectionCard>
          {(() => {
            const emptyCount = groups.reduce(
              (sum, group) => sum + (group.links ?? []).filter((link) => isEmptyLink(link)).length,
              0,
            );
            if (!emptyCount) return null;
            return (
              <Box padding={3} background="neutral100" hasRadius>
                <Typography variant="pi" textColor="neutral700">
                  {emptyCount} lege link(s) staan in de data maar zijn verborgen in de structuur (geen naam/URL). Ze
                  verdwijnen niet automatisch.
                </Typography>
                <Box paddingTop={2}>
                  <Button
                    type="button"
                    variant="tertiary"
                    onClick={() => {
                      const nextGroups = groups.map((group) => ({
                        ...group,
                        links: (group.links ?? []).filter((link) => !isEmptyLink(link)),
                      }));
                      const nextColumns = [...columns];
                      nextColumns[columnIndex] = { ...column, groups: nextGroups };
                      updateItem(itemIndex, { ...item, columns: nextColumns });
                    }}
                  >
                    Lege links nu opruimen
                  </Button>
                </Box>
              </Box>
            );
          })()}
          <SectionCard title="Volgorde">
            {moveControls(
              columnIndex === 0,
              columnIndex >= columns.length - 1,
              () => {
                updateItem(itemIndex, { ...item, columns: moveInArray(columns, columnIndex, -1) });
                setSelection({ kind: "column", itemIndex, columnIndex: columnIndex - 1 });
              },
              () => {
                updateItem(itemIndex, { ...item, columns: moveInArray(columns, columnIndex, 1) });
                setSelection({ kind: "column", itemIndex, columnIndex: columnIndex + 1 });
              },
            )}
          </SectionCard>
          <Button
            type="button"
            variant="danger-light"
            onClick={() =>
              askDelete(
                `Verwijder categorie “${(column.label ?? "").trim() || `Categorie ${columnIndex + 1}`}”?`,
                () => {
                  updateItem(
                    itemIndex,
                    { ...item, columns: columns.filter((_, index) => index !== columnIndex) },
                  );
                  setSelection({ kind: "item", itemIndex });
                },
                "Alle groepen en links in deze categorie verdwijnen ook.",
              )
            }
          >
            Categorie verwijderen
          </Button>
        </Flex>
      );
    }

    if (selection.kind === "group" && item.__component === "nav.mega") {
      const column = item.columns?.[selection.columnIndex];
      const group = column?.groups?.[selection.groupIndex];
      if (!column || !group) return null;
      const columns = item.columns ?? [];
      const groups = column.groups ?? [];
      const { columnIndex, groupIndex } = selection;
      return (
        <Flex direction="column" alignItems="stretch" gap={3}>
          <DetailHero
            path={pathLabel()}
            title={groupDisplayName(group, groupIndex, pages)}
            subtitle={`Groep ${groupIndex + 1} in categorie “${(column.label ?? "").trim() || "Categorie"}”. Groepen blijven apart bewaard.`}
          />
          <SectionCard
            title="Structuur"
            hint="Op de website: eerste link in de groep = wit en dik. Volgende links in dezelfde groep = grijs. Een los niet-klikbaar tussenkopje bestaat nog niet zonder schema-uitbreiding."
          >
            <PreviewCard
              title="Verwachte weergave van deze groep"
              lines={
                (group.links ?? []).some((link) => !isEmptyLink(link))
                  ? (group.links ?? [])
                      .filter((link) => !isEmptyLink(link))
                      .map((link, index) =>
                        index === 0
                          ? `● ${linkDisplayName(link, pages)} (nadruk)`
                          : `○ ${linkDisplayName(link, pages)} (aanvullend)`,
                      )
                  : ["Nog geen links — voeg er hieronder een toe"]
              }
            />
            {(group.links ?? []).filter((link) => !isEmptyLink(link)).length === 0 ? (
              <StatusBanner tone="warn">Deze groep bevat nog geen klikbare links.</StatusBanner>
            ) : (
              <div style={{ fontSize: 13, color: menuTheme.muted }}>
                {(group.links ?? []).filter((link) => !isEmptyLink(link)).length} zichtbare link(s) in deze groep
              </div>
            )}
          </SectionCard>
          <SectionCard title="Volgorde">
            {moveControls(
              groupIndex === 0,
              groupIndex >= groups.length - 1,
              () => {
                const nextGroups = moveInArray(groups, groupIndex, -1);
                const nextColumns = [...columns];
                nextColumns[columnIndex] = { ...column, groups: nextGroups };
                updateItem(itemIndex, { ...item, columns: nextColumns });
                setSelection({ kind: "group", itemIndex, columnIndex, groupIndex: groupIndex - 1 });
              },
              () => {
                const nextGroups = moveInArray(groups, groupIndex, 1);
                const nextColumns = [...columns];
                nextColumns[columnIndex] = { ...column, groups: nextGroups };
                updateItem(itemIndex, { ...item, columns: nextColumns });
                setSelection({ kind: "group", itemIndex, columnIndex, groupIndex: groupIndex + 1 });
              },
            )}
          </SectionCard>
          <SectionCard title="Onderdeel toevoegen" hint={`Je voegt een onderdeel toe onder “${groupDisplayName(group, groupIndex, pages)}”.`}>
            <AddChooser
              depth={0}
              contextLabel={groupDisplayName(group, groupIndex, pages)}
              options={[
                {
                  id: "link",
                  label: "Link aan deze groep toevoegen",
                  hint: "Nieuwe klikbare link in deze groep. Positie bepaalt nadruk (eerste) of aanvullend (volgende).",
                  onClick: () => addLinkUnderColumn(itemIndex, columnIndex, groupIndex),
                },
              ]}
            />
          </SectionCard>
          <Button
            type="button"
            variant="danger-light"
            onClick={() =>
              askDelete(
                `Verwijder groep “${groupDisplayName(group, groupIndex, pages)}”?`,
                () => {
                  const nextGroups = groups.filter((_, index) => index !== groupIndex);
                  const nextColumns = [...columns];
                  nextColumns[columnIndex] = { ...column, groups: nextGroups };
                  updateItem(itemIndex, { ...item, columns: nextColumns });
                  setSelection({ kind: "column", itemIndex, columnIndex });
                },
                "Alle links in deze groep verdwijnen ook. Andere groepen blijven intact.",
              )
            }
          >
            Groep verwijderen
          </Button>
        </Flex>
      );
    }

    if (selection.kind === "megaLink" && item.__component === "nav.mega") {
      const column = item.columns?.[selection.columnIndex];
      const group = column?.groups?.[selection.groupIndex];
      const link = group?.links?.[selection.linkIndex];
      if (!column || !group || !link) return null;
      const columns = item.columns ?? [];
      const groups = column.groups ?? [];
      const links = group.links ?? [];
      const { columnIndex, groupIndex, linkIndex } = selection;
      const colName = (column.label ?? "").trim() || `Categorie ${columnIndex + 1}`;
      const destMode: "page" | "url" = (link.href ?? "").trim() ? "url" : "page";
      const visibility = linkVisibilityStatus(link, pages);
      const storedLabel = link.label ?? "";
      const derivedLabel = pageCatalogLabel(link, pages);
      const nameUsesPage = !(storedLabel.trim()) && Boolean(derivedLabel);
      const nameMissingForUrl = destMode === "url" && !(storedLabel.trim());
      const emphasized = isEmphasizedLinkInGroup(links, linkIndex);
      const patchLink = (nextLink: NavPageLink) => {
        const nextLinks = [...links];
        nextLinks[linkIndex] = nextLink;
        const nextGroups = [...groups];
        nextGroups[groupIndex] = { ...group, links: nextLinks };
        const nextColumns = [...columns];
        nextColumns[columnIndex] = { ...column, groups: nextGroups };
        updateItem(itemIndex, { ...item, columns: nextColumns });
      };
      return (
        <Flex direction="column" alignItems="stretch" gap={3}>
          <DetailHero
            path={pathLabel()}
            title={linkDisplayName(link, pages)}
            subtitle={`Klikbare link in “${colName}” · Groep ${groupIndex + 1}. Bezoekers zien deze tekst in de dropdown.`}
            icon="☍"
          />
          <SectionCard title="Naam" hint="Welke tekst zien bezoekers in het menu?">
            {textField(
              "mega-link-label",
              "Naam van de link",
              nameUsesPage ? derivedLabel : storedLabel,
              (value) => {
                // Don't persist the derived catalog name unless the user changes it.
                if (!(link.label ?? "").trim() && value.trim() === derivedLabel.trim()) return;
                patchLink({ ...link, label: value });
              },
              nameUsesPage
                ? "Automatisch van de gekozen pagina. Pas aan als je een andere menutekst wilt."
                : undefined,
            )}
            {nameMissingForUrl ? (
              <StatusBanner tone="error">Vul een naam in. Dit is de tekst die bezoekers in het menu zien.</StatusBanner>
            ) : null}
          </SectionCard>
          <SectionCard title="Bestemming" hint="Waar moet deze link naartoe als iemand erop klikt?">
            <Flex gap={2} wrap="wrap" paddingBottom={2}>
              <Button
                type="button"
                size="S"
                variant={destMode === "page" ? "default" : "tertiary"}
                onClick={() => patchLink({ ...link, href: "" })}
              >
                Bestaande pagina
              </Button>
              <Button
                type="button"
                size="S"
                variant={destMode === "url" ? "default" : "tertiary"}
                onClick={() => patchLink({ ...link, page: { entryKey: "" }, href: link.href || "/" })}
              >
                Eigen URL
              </Button>
            </Flex>
            {destMode === "page" ? (
              <Field.Root name="mega-link-page">
                <Field.Label>Kies een pagina</Field.Label>
                <Box paddingTop={1}>
                  <select
                    aria-label="Kies een pagina"
                    value={link.page?.entryKey ?? ""}
                    onChange={(event) => {
                      const entryKey = event.target.value;
                      const match = pages.find((page) => page.entryKey === entryKey);
                      const nextLabel =
                        (link.label ?? "").trim() ||
                        (match?.navLabel ?? "").trim() ||
                        (match?.title ?? "").trim() ||
                        "";
                      patchLink({
                        ...link,
                        href: "",
                        label: nextLabel || link.label,
                        page: {
                          entryKey,
                          documentId: match?.documentId,
                          title: match?.title,
                          navLabel: match?.navLabel,
                        },
                      });
                    }}
                    style={{ width: "100%", minHeight: 40, padding: "0 12px", borderRadius: 8 }}
                  >
                    <option value="">— Kies een pagina —</option>
                    {pages
                      .filter((page) => page.entryKey)
                      .map((page) => (
                        <option key={page.entryKey} value={page.entryKey}>
                          {pageOptionLabel(page)}
                        </option>
                      ))}
                  </select>
                </Box>
              </Field.Root>
            ) : (
              textField(
                "mega-link-href",
                "Eigen URL",
                link.href ?? "",
                (value) => patchLink({ ...link, href: value, page: { entryKey: "" } }),
                "Bijvoorbeeld /online-marketing/seo of https://voorbeeld.nl",
              )
            )}
            <StatusBanner tone={visibility.tone}>{visibility.message}</StatusBanner>
          </SectionCard>
          <SectionCard title="Weergave op de website" hint="Bepaald door de positie in de groep — geen aparte kleurinstelling.">
            <PreviewCard
              title={emphasized ? "Nadruk (eerste in groep)" : "Aanvullend in groep"}
              lines={[
                emphasized
                  ? "Wit en dikgedrukt op de website"
                  : "Grijs op de website (onder de nadruk-link)",
                `Categorie: ${colName}`,
                `Groep ${groupIndex + 1}`,
              ]}
            />
            <div style={{ fontSize: 13, color: menuTheme.muted, lineHeight: 1.45 }}>
              Verplaats omhoog/omlaag om de nadruk te wijzigen. Een nieuwe groep begint opnieuw met een nadruk-link.
            </div>
          </SectionCard>
          <SectionCard title="Volgorde">
            {moveControls(
              linkIndex === 0,
              linkIndex >= links.length - 1,
              () => {
                const nextLinks = moveInArray(links, linkIndex, -1);
                const nextGroups = [...groups];
                nextGroups[groupIndex] = { ...group, links: nextLinks };
                const nextColumns = [...columns];
                nextColumns[columnIndex] = { ...column, groups: nextGroups };
                updateItem(itemIndex, { ...item, columns: nextColumns });
                setSelection({ kind: "megaLink", itemIndex, columnIndex, groupIndex, linkIndex: linkIndex - 1 });
              },
              () => {
                const nextLinks = moveInArray(links, linkIndex, 1);
                const nextGroups = [...groups];
                nextGroups[groupIndex] = { ...group, links: nextLinks };
                const nextColumns = [...columns];
                nextColumns[columnIndex] = { ...column, groups: nextGroups };
                updateItem(itemIndex, { ...item, columns: nextColumns });
                setSelection({ kind: "megaLink", itemIndex, columnIndex, groupIndex, linkIndex: linkIndex + 1 });
              },
            )}
          </SectionCard>
          <Button
            type="button"
            variant="danger-light"
            onClick={() =>
              askDelete(`Verwijder link “${linkDisplayName(link, pages)}”?`, () => {
                const nextLinks = links.filter((_, index) => index !== linkIndex);
                const nextGroups = [...groups];
                nextGroups[groupIndex] = { ...group, links: nextLinks };
                const nextColumns = [...columns];
                nextColumns[columnIndex] = { ...column, groups: nextGroups };
                updateItem(itemIndex, { ...item, columns: nextColumns });
                setSelection(
                  nextLinks.length
                    ? {
                        kind: "megaLink",
                        itemIndex,
                        columnIndex,
                        groupIndex,
                        linkIndex: Math.min(linkIndex, nextLinks.length - 1),
                      }
                    : groups.length > 1
                      ? { kind: "group", itemIndex, columnIndex, groupIndex }
                      : { kind: "column", itemIndex, columnIndex },
                );
              })
            }
          >
            Verwijderen
          </Button>
        </Flex>
      );
    }

    if (selection.kind === "dropdownLink" && item.__component === "nav.dropdown") {
      const links = item.links ?? [];
      const link = links[selection.linkIndex];
      if (!link) return null;
      const linkIndex = selection.linkIndex;
      const destMode: "page" | "url" = (link.href ?? "").trim() ? "url" : "page";
      const visibility = linkVisibilityStatus(link, pages);
      const storedLabel = link.label ?? "";
      const derivedLabel = pageCatalogLabel(link, pages);
      const nameUsesPage = !(storedLabel.trim()) && Boolean(derivedLabel);
      const nameMissingForUrl = destMode === "url" && !(storedLabel.trim());
      const patchLink = (nextLink: NavPageLink) => {
        const next = [...links];
        next[linkIndex] = nextLink;
        updateItem(itemIndex, { ...item, links: next });
      };
      return (
        <Flex direction="column" alignItems="stretch" gap={3}>
          <DetailHero
            path={pathLabel()}
            title={linkDisplayName(link, pages)}
            subtitle="Klikbare link in dit submenu. Bezoekers zien deze tekst in de dropdown."
            icon="☍"
          />
          <SectionCard title="Naam" hint="Welke tekst zien bezoekers in het menu?">
            {textField(
              "dd-link-label",
              "Naam van de link",
              nameUsesPage ? derivedLabel : storedLabel,
              (value) => {
                if (!(link.label ?? "").trim() && value.trim() === derivedLabel.trim()) return;
                patchLink({ ...link, label: value });
              },
              nameUsesPage
                ? "Automatisch van de gekozen pagina. Pas aan als je een andere menutekst wilt."
                : undefined,
            )}
            {nameMissingForUrl ? (
              <StatusBanner tone="error">Vul een naam in. Dit is de tekst die bezoekers in het menu zien.</StatusBanner>
            ) : null}
          </SectionCard>
          <SectionCard title="Bestemming" hint="Waar moet deze link naartoe als iemand erop klikt?">
            <Flex gap={2} wrap="wrap" paddingBottom={2}>
              <Button
                type="button"
                size="S"
                variant={destMode === "page" ? "default" : "tertiary"}
                onClick={() => patchLink({ ...link, href: "" })}
              >
                Bestaande pagina
              </Button>
              <Button
                type="button"
                size="S"
                variant={destMode === "url" ? "default" : "tertiary"}
                onClick={() => patchLink({ ...link, page: { entryKey: "" }, href: link.href || "/" })}
              >
                Eigen URL
              </Button>
            </Flex>
            {destMode === "page" ? (
              <Field.Root name="dd-link-page">
                <Field.Label>Kies een pagina</Field.Label>
                <Box paddingTop={1}>
                  <select
                    aria-label="Kies een pagina"
                    value={link.page?.entryKey ?? ""}
                    onChange={(event) => {
                      const entryKey = event.target.value;
                      const match = pages.find((page) => page.entryKey === entryKey);
                      const nextLabel =
                        (link.label ?? "").trim() ||
                        (match?.navLabel ?? "").trim() ||
                        (match?.title ?? "").trim() ||
                        "";
                      patchLink({
                        ...link,
                        href: "",
                        label: nextLabel || link.label,
                        page: {
                          entryKey,
                          documentId: match?.documentId,
                          title: match?.title,
                          navLabel: match?.navLabel,
                        },
                      });
                    }}
                    style={{ width: "100%", minHeight: 40, padding: "0 12px", borderRadius: 8 }}
                  >
                    <option value="">— Kies een pagina —</option>
                    {pages
                      .filter((page) => page.entryKey)
                      .map((page) => (
                        <option key={page.entryKey} value={page.entryKey}>
                          {pageOptionLabel(page)}
                        </option>
                      ))}
                  </select>
                </Box>
              </Field.Root>
            ) : (
              textField(
                "dd-link-href",
                "Eigen URL",
                link.href ?? "",
                (value) => patchLink({ ...link, href: value, page: { entryKey: "" } }),
                "Bijvoorbeeld /over-ons of https://voorbeeld.nl",
              )
            )}
            <StatusBanner tone={visibility.tone}>{visibility.message}</StatusBanner>
          </SectionCard>
          <SectionCard title="Volgorde">
            {moveControls(
              linkIndex === 0,
              linkIndex >= links.length - 1,
              () => {
                updateItem(itemIndex, { ...item, links: moveInArray(links, linkIndex, -1) });
                setSelection({ kind: "dropdownLink", itemIndex, linkIndex: linkIndex - 1 });
              },
              () => {
                updateItem(itemIndex, { ...item, links: moveInArray(links, linkIndex, 1) });
                setSelection({ kind: "dropdownLink", itemIndex, linkIndex: linkIndex + 1 });
              },
            )}
          </SectionCard>
          <Button
            type="button"
            variant="danger-light"
            onClick={() =>
              askDelete(`Verwijder link “${linkDisplayName(link)}”?`, () => {
                const next = links.filter((_, index) => index !== linkIndex);
                updateItem(itemIndex, { ...item, links: next });
                setSelection(
                  next.length
                    ? { kind: "dropdownLink", itemIndex, linkIndex: Math.min(linkIndex, next.length - 1) }
                    : { kind: "item", itemIndex },
                );
              })
            }
          >
            Verwijderen
          </Button>
        </Flex>
      );
    }

    return null;
  }

  function sectionButton(id: MenuSection, label: string) {
    const active = section === id;
    return (
      <button
        type="button"
        onClick={() => {
          setSection(id);
          setSelection(null);
          setPendingDelete(null);
          setShowAdvanced(false);
        }}
        style={{
          border: active ? `1px solid ${menuTheme.accent}` : `1px solid ${menuTheme.cardBorder}`,
          background: active ? menuTheme.accent : "transparent",
          color: active ? "#fff" : menuTheme.text,
          borderRadius: 999,
          padding: "8px 14px",
          font: "inherit",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  }

  function renderContactSection() {
    return (
      <Flex direction="column" alignItems="stretch" gap={3} style={{ maxWidth: 640 }}>
        <DetailHero
          path="Header"
          title="Logo, contact & knoppen"
          subtitle="Onderdelen bij logo, telefoon en knoppen. Wat hier niet bewerkbaar is, staat vast in de websitecode."
        />
        <SectionCard title="Logo" hint="Merkdraak-woordmerk, linkt altijd naar de homepage.">
          <Typography variant="pi" textColor="neutral600">
            Nog niet bewerkbaar via Menu (vast in de frontend).
          </Typography>
        </SectionCard>
        <SectionCard title="Telefoonnummer" hint="Zichtbaar op desktop in de header; op mobiel via het menu.">
          {textField(
            "header-phone",
            "Telefoon zoals getoond in de header",
            phoneDisplay,
            (value) => onPhoneChange?.(value),
            "Opslaan via de knop Opslaan bovenin.",
          )}
        </SectionCard>
        <SectionCard title="Knop “Gratis scan”">
          <Typography variant="pi" textColor="neutral600">
            Tekst en bestemming staan vast in de frontend (`/online-marketing/scan`). Nog niet bewerkbaar — CMS-uitbreiding
            eerst afstemmen.
          </Typography>
        </SectionCard>
        <SectionCard title="Tekst links in de bovenste balk">
          <Typography variant="pi" textColor="neutral600">
            “360° Marketingbureau · Maatwerk” is hardcoded in de frontend. Nog niet bewerkbaar.
          </Typography>
        </SectionCard>
      </Flex>
    );
  }

  return (
    <div className="merkdraak-menu-editor" style={{ maxWidth: 1260, margin: "0 auto", color: menuTheme.text }}>
      <style>{`
        .merkdraak-menu-editor input, .merkdraak-menu-editor textarea, .merkdraak-menu-editor select {
          background: #12121f !important;
          color: #ececf4 !important;
          border-color: #3a3a55 !important;
          border-radius: 8px !important;
          min-height: 40px;
          font-size: 14px !important;
        }
        .merkdraak-menu-editor label { color: #cfcfe0 !important; font-size: 13px !important; }
        .merkdraak-menu-editor [data-strapi-field] p, .merkdraak-menu-editor p { color: inherit; }
      `}</style>
      <div style={{ padding: 20, borderRadius: 16, background: menuTheme.shell, border: `1px solid ${menuTheme.cardBorder}` }}>
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>Menu</div>
        <div style={{ marginTop: 6, fontSize: 14, color: menuTheme.muted, maxWidth: 640, lineHeight: 1.45 }}>
          Beheer hier wat bezoekers in de header zien. Kies eerst een onderdeel hieronder.
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
          {sectionButton("main", "Hoofdmenu")}
          {sectionButton("utility", "Bovenste balk")}
          {sectionButton("contact", "Logo, contact & knoppen")}
        </div>

        {section === "contact" ? (
          <div style={{ marginTop: 20 }}>{renderContactSection()}</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {section === "main" ? (
                <>
                  <Button type="button" variant="secondary" startIcon={<Plus />} onClick={() => addTopLevel("nav.mega")}>
                    Dropdown-menu toevoegen
                  </Button>
                  <Button type="button" variant="secondary" startIcon={<Plus />} onClick={() => addTopLevel("nav.link")}>
                    Link toevoegen
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="secondary" startIcon={<Plus />} onClick={() => addTopLevel("nav.link")}>
                    Link toevoegen
                  </Button>
                  <Button type="button" variant="secondary" startIcon={<Plus />} onClick={() => addTopLevel("nav.dropdown")}>
                    Submenu toevoegen
                  </Button>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap", marginTop: 18 }}>
              <div
                style={{
                  width: 380,
                  flex: "0 0 380px",
                  maxHeight: "72vh",
                  overflow: "auto",
                  padding: 16,
                  borderRadius: 14,
                  background: menuTheme.panel,
                  border: `1px solid ${menuTheme.cardBorder}`,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700 }}>Menu-indeling</div>
                <div style={{ marginTop: 4, fontSize: 13, color: menuTheme.muted, lineHeight: 1.4 }}>
                  {section === "utility"
                    ? "De volgorde en opbouw van de bovenste balk."
                    : "De volgorde en opbouw van je hoofdmenu."}
                </div>
                <div style={{ marginTop: 14 }}>{renderTree()}</div>
              </div>
              <div style={{ flex: "1 1 420px", maxWidth: 680, minWidth: 280 }}>
                <div style={{ marginBottom: 10, fontSize: 13, color: menuTheme.muted }}>
                  Wijzigingen bewaar je met <strong style={{ color: menuTheme.text }}>Opslaan</strong> bovenin deze pagina.
                </div>
                {hasUnsavedChanges ? (
                  <div style={{ marginBottom: 12 }}>
                    <StatusBanner tone="warn">
                      Er zijn niet-opgeslagen wijzigingen. Klik op Opslaan om ze op de website te zetten.
                    </StatusBanner>
                  </div>
                ) : null}
                {renderDetail()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
