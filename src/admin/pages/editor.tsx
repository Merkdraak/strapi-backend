import { Fragment, useEffect, useState } from "react";
import { styled } from "styled-components";
import { Layouts, Page, Table, useFetchClient, useNotification } from "@strapi/strapi/admin";
import {
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  EmptyStateLayout,
  Field,
  Flex,
  Link,
  Loader,
  Searchbar,
  SearchForm,
  Status,
  TextInput,
  Typography,
} from "@strapi/design-system";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight, Cog, Globe, Plus } from "@strapi/icons";
import { EmptyDocuments } from "@strapi/icons/symbols";

type SiteRow = { key: string; name: string; domain: string; editorUrl: string };
type PageRow = { documentId: string; title: string; slug: string; visibility: string; pageType: string };
type LinkRow = { label?: string; href?: string };
type SiteEditor = {
  contact: { phoneDisplay: string; email: string; address: string };
  settings: { articlePrefix: string; googlePlaceId: string; formWebhook: string };
  footerServices: LinkRow[];
  footerOrganization: LinkRow[];
  items: { __component?: string; label?: string; page?: { entryKey?: string }; links?: { label?: string; page?: { entryKey?: string } }[] }[];
};

const statusLabel: Record<string, string> = {
  planned: "Gepland",
  concept: "Concept",
  published: "Gepubliceerd",
};

const typeLabel: Record<string, string> = {
  home: "Home",
  company: "Bedrijf",
  overview: "Overzicht",
  service: "Dienst",
  case: "Case",
  knowledge: "Kennis",
};

const statusVariant: Record<string, "success" | "secondary" | "alternative"> = {
  published: "success",
  concept: "secondary",
  planned: "alternative",
};

const pageHeaders = [
  { name: "title", label: "Pagina" },
  { name: "slug", label: "Pad" },
  { name: "pageType", label: "Soort" },
  { name: "visibility", label: "Status" },
];

const SiteCard = styled(Box)`
  width: 100%;
  max-width: 36rem;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary200};
  }

  &:hover [data-arrow] {
    color: ${({ theme }) => theme.colors.primary600};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary600};
    outline-offset: 2px;
  }
`;

function BackLink({ href, label, onBack }: { href: string; label: string; onBack: () => void }) {
  return (
    <Link
      startIcon={<ArrowLeft />}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onBack();
      }}
    >
      {label}
    </Link>
  );
}

function sectionName(page: PageRow) {
  const first = (page.slug ?? "").split("/").filter(Boolean)[0] ?? "";
  const names: Record<string, string> = {
    "online-marketing": "Online marketing",
    websites: "Websites",
    merk: "Merk en creatie",
    cases: "Cases",
    kennisbank: "Kennisbank",
  };
  if (!first) return "Home";
  if (names[first]) return names[first];
  if (page.pageType === "company") return "Bedrijf";
  if (page.pageType === "case") return "Cases";
  if (page.pageType === "knowledge") return "Kennisbank";
  return "Overig";
}

function groupPages(pages: PageRow[]) {
  const order = ["Home", "Online marketing", "Websites", "Merk en creatie", "Cases", "Kennisbank", "Bedrijf", "Overig"];
  const groups = new Map<string, PageRow[]>();
  for (const page of pages) {
    const name = sectionName(page);
    groups.set(name, [...(groups.get(name) ?? []), page]);
  }
  return order.filter((name) => groups.has(name)).map((name) => ({
    name,
    pages: (groups.get(name) ?? []).slice().sort((a, b) => {
      const depthA = (a.slug ?? "").split("/").filter(Boolean).length;
      const depthB = (b.slug ?? "").split("/").filter(Boolean).length;
      return depthA - depthB || a.title.localeCompare(b.title, "nl");
    }),
  }));
}

export default function MerkdraakEditor() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [siteKey, setSiteKey] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingSites, setLoadingSites] = useState(true);
  const [nav, setNav] = useState<SiteEditor | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [closed, setClosed] = useState<Record<string, boolean>>({
    "Online marketing": true,
    Websites: true,
    "Merk en creatie": true,
  });
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();

  useEffect(() => {
    function syncFromUrl() {
      const params = new URLSearchParams(window.location.search);
      setSiteKey(params.get("siteKey") ?? "");
      setDocumentId(params.get("documentId") ?? "");
    }
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    get("/admin/merkdraak-editor/sites")
      .then((response: { data?: { sites?: SiteRow[] } }) => setSites(response.data?.sites ?? []))
      .catch(() => setError("Websites konden niet worden geladen."))
      .finally(() => setLoadingSites(false));
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [get]);

  useEffect(() => {
    if (!siteKey) return;
    setLoadingPages(true);
    get(`/admin/merkdraak-editor/pages?siteKey=${encodeURIComponent(siteKey)}`)
      .then((response: { data?: { pages?: PageRow[] } }) => {
        setPages(response.data?.pages ?? []);
        setError("");
      })
      .catch(() => setError("Pagina's konden niet worden geladen."))
      .finally(() => setLoadingPages(false));
  }, [get, siteKey, documentId]);

  useEffect(() => {
    if (!siteKey || !documentId || documentId === "site") {
      setSrc("");
      return;
    }
    const next = documentId === "nieuw" ? "/editor/nieuw" : `/editor/${documentId}`;
    get(`/admin/merkdraak-editor/open?siteKey=${encodeURIComponent(siteKey)}&next=${encodeURIComponent(next)}`)
      .then((response: { data?: { url?: string } }) => {
        if (!response.data?.url) {
          setError("Deze website heeft geen editor-adres.");
          setSrc("");
          return;
        }
        setError("");
        setSrc(response.data.url);
      })
      .catch(() => setError("De editor kon niet worden geopend."));
  }, [get, siteKey, documentId]);

  useEffect(() => {
    if (documentId !== "site" || !siteKey) return;
    get(`/admin/merkdraak-editor/navigation?siteKey=${encodeURIComponent(siteKey)}`)
      .then((response: { data?: SiteEditor }) => {
        const data = response.data;
        if (!data) {
          setNav(null);
          return;
        }
        setNav({
          ...data,
          settings: {
            articlePrefix: data.settings?.articlePrefix || "kennisbank",
            googlePlaceId: data.settings?.googlePlaceId ?? "",
            formWebhook: data.settings?.formWebhook ?? "",
          },
        });
      })
      .catch(() => setError("De site kon niet worden geladen."));
  }, [documentId, get, siteKey]);

  function remember(nextSite: string, nextDocument: string) {
    const params = new URLSearchParams();
    if (nextSite) params.set("siteKey", nextSite);
    if (nextDocument) params.set("documentId", nextDocument);
    const query = params.toString();
    window.history.pushState(null, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
    setSiteKey(nextSite);
    setDocumentId(nextDocument);
    setError("");
  }

  const site = sites.find((item) => item.key === siteKey);

  if (!siteKey) {
    return (
      <Page.Main>
        <Page.Title>Websites</Page.Title>
        <Layouts.Header title="Websites" subtitle={sites.length ? `${sites.length} ${sites.length === 1 ? "website" : "websites"}` : "Kies een website en bewerk de pagina's."} />
        <Layouts.Content>
          {error ? (
            <Box paddingBottom={4}>
              <Alert closeLabel="Sluiten" title="Laden mislukt" variant="danger" onClose={() => setError("")}>
                {error}
              </Alert>
            </Box>
          ) : null}
          {loadingSites ? (
            <Flex justifyContent="center" padding={11}>
              <Loader>Websites laden…</Loader>
            </Flex>
          ) : sites.length === 0 ? (
            <EmptyStateLayout icon={<EmptyDocuments width="10rem" />} content={error || "Nog geen websites."} />
          ) : (
            <Flex direction="column" alignItems="stretch" gap={4}>
              {sites.map((item) => (
                <SiteCard
                  key={item.key}
                  role="button"
                  tabIndex={0}
                  hasRadius
                  background="neutral0"
                  shadow="tableShadow"
                  padding={5}
                  borderColor="neutral150"
                  borderStyle="solid"
                  borderWidth="1px"
                  onClick={() => remember(item.key, "")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      remember(item.key, "");
                    }
                  }}
                >
                  <Flex justifyContent="space-between" alignItems="center" gap={4}>
                    <Flex gap={4} alignItems="center">
                      <Flex background="primary100" hasRadius width="3.2rem" height="3.2rem" alignItems="center" justifyContent="center" flex="0 0 auto">
                        <Typography textColor="primary600" aria-hidden>
                          <Globe width="1.4rem" height="1.4rem" />
                        </Typography>
                      </Flex>
                      <Flex direction="column" alignItems="flex-start" gap={1}>
                        <Typography variant="delta" fontWeight="bold" textColor="neutral800">{item.name}</Typography>
                        <Typography variant="pi" textColor="neutral600">{item.domain || item.key}</Typography>
                      </Flex>
                    </Flex>
                    <Typography textColor="neutral500" data-arrow aria-hidden>
                      <ArrowRight width="1.2rem" height="1.2rem" />
                    </Typography>
                  </Flex>
                </SiteCard>
              ))}
            </Flex>
          )}
        </Layouts.Content>
      </Page.Main>
    );
  }

  if (!documentId) {
    const needle = query.trim().toLowerCase();
    const visible = pages.filter((page) => {
      if (status && page.visibility !== status) return false;
      if (!needle) return true;
      return `${page.title} ${page.slug}`.toLowerCase().includes(needle);
    });
    const counts = {
      "": pages.length,
      published: pages.filter((page) => page.visibility === "published").length,
      concept: pages.filter((page) => page.visibility === "concept").length,
      planned: pages.filter((page) => page.visibility === "planned").length,
    };
    const tableRows = visible.map((page) => ({ ...page, id: page.documentId }));
    const subtitle = [site?.domain || siteKey, pages.length ? `${pages.length} pagina's` : ""].filter(Boolean).join(" · ");
    return (
      <Page.Main>
        <Page.Title>{site?.name ?? siteKey}</Page.Title>
        <Layouts.Header
          title={site?.name ?? siteKey}
          subtitle={subtitle}
          navigationAction={<BackLink href="/admin/merkdraak-editor" label="Alle websites" onBack={() => remember("", "")} />}
          secondaryAction={
            <Button variant="secondary" startIcon={<Cog />} onClick={() => remember(siteKey, "site")}>
              Menu en footer
            </Button>
          }
          primaryAction={
            <Button startIcon={<Plus />} onClick={() => remember(siteKey, "nieuw")}>
              Nieuwe pagina
            </Button>
          }
        />
        <Layouts.Action
          startActions={
            <Box minWidth="16rem" maxWidth="32rem" width="100%">
              <SearchForm onSubmit={(event) => event.preventDefault()}>
                <Searchbar
                  name="pages"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onClear={() => setQuery("")}
                  clearLabel="Zoekopdracht wissen"
                  placeholder="Zoek op naam of pad"
                >
                  Zoek op naam of pad
                </Searchbar>
              </SearchForm>
            </Box>
          }
          endActions={
            <Flex gap={2} wrap="wrap" alignItems="center">
              {(["", "published", "concept", "planned"] as const).map((value) => (
                <Badge
                  key={value || "all"}
                  size="S"
                  active={status === value}
                  cursor="pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => setStatus(value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setStatus(value);
                    }
                  }}
                >
                  {value ? statusLabel[value] : "Alles"} {counts[value]}
                </Badge>
              ))}
            </Flex>
          }
        />
        <Layouts.Content>
          {error && pages.length === 0 ? (
            <Box paddingBottom={4}>
              <Alert closeLabel="Sluiten" title="Laden mislukt" variant="danger" onClose={() => setError("")}>
                {error}
              </Alert>
            </Box>
          ) : null}
          <Table.Root rows={tableRows} headers={pageHeaders} isLoading={loadingPages && pages.length === 0}>
            <Table.Content>
              <Table.Head>
                {pageHeaders.map((header) => (
                  <Table.HeaderCell key={header.name} {...header} />
                ))}
              </Table.Head>
              <Table.Loading>Pagina's laden…</Table.Loading>
              <Table.Empty
                content={pages.length ? "Geen pagina's voor deze zoekopdracht." : "Nog geen pagina's."}
                action={
                  pages.length ? undefined : (
                    <Button variant="secondary" startIcon={<Plus />} onClick={() => remember(siteKey, "nieuw")}>
                      Nieuwe pagina
                    </Button>
                  )
                }
              />
              <Table.Body>
                {groupPages(visible).map((group) => {
                  const open = needle.length > 0 || !closed[group.name];
                  return (
                    <Fragment key={group.name}>
                      <Table.Row
                        cursor="pointer"
                        tabIndex={0}
                        aria-expanded={open}
                        onClick={() => setClosed((current) => ({ ...current, [group.name]: open }))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setClosed((current) => ({ ...current, [group.name]: open }));
                          }
                        }}
                      >
                        <Table.Cell colSpan={4} background="neutral100">
                          <Flex justifyContent="space-between" alignItems="center" paddingTop={1} paddingBottom={1}>
                            <Flex gap={2} alignItems="center">
                              <Typography textColor="neutral600" aria-hidden>
                                {open ? <ChevronDown width="0.8rem" height="0.8rem" /> : <ChevronRight width="0.8rem" height="0.8rem" />}
                              </Typography>
                              <Typography fontWeight="semiBold" textColor="neutral800">
                                {group.name}
                              </Typography>
                            </Flex>
                            <Badge size="S">{group.pages.length}</Badge>
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                      {open
                        ? group.pages.map((page) => {
                            const depth = Math.max(0, (page.slug ?? "").split("/").filter(Boolean).length - 1);
                            return (
                              <Table.Row
                                key={page.documentId}
                                cursor="pointer"
                                tabIndex={0}
                                onClick={() => remember(siteKey, page.documentId)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    remember(siteKey, page.documentId);
                                  }
                                }}
                              >
                                <Table.Cell>
                                  <Box paddingLeft={depth * 4}>
                                    <Typography fontWeight="semiBold" textColor="primary600">
                                      {page.title}
                                    </Typography>
                                  </Box>
                                </Table.Cell>
                                <Table.Cell>
                                  <Typography textColor="neutral600" ellipsis>
                                    {page.slug ? `/${page.slug}` : "/"}
                                  </Typography>
                                </Table.Cell>
                                <Table.Cell>
                                  <Typography textColor="neutral600">{typeLabel[page.pageType] ?? page.pageType}</Typography>
                                </Table.Cell>
                                <Table.Cell>
                                  <Status variant={statusVariant[page.visibility] ?? "alternative"} size="S">
                                    <Typography variant="omega" fontWeight="bold">
                                      {statusLabel[page.visibility] ?? page.visibility}
                                    </Typography>
                                  </Status>
                                </Table.Cell>
                              </Table.Row>
                            );
                          })
                        : null}
                    </Fragment>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.Root>
        </Layouts.Content>
      </Page.Main>
    );
  }

  if (documentId === "site") {
    const pagesHref = `/admin/merkdraak-editor?siteKey=${encodeURIComponent(siteKey)}`;
    if (!nav) {
      return (
        <Page.Main>
          <Page.Title>Menu en footer</Page.Title>
          <Layouts.Header title="Menu en footer" navigationAction={<BackLink href={pagesHref} label="Pagina's" onBack={() => remember(siteKey, "")} />} />
          <Layouts.Content>
            <Flex justifyContent="center" padding={11}>
              <Loader>Menu laden…</Loader>
            </Flex>
          </Layouts.Content>
        </Page.Main>
      );
    }
    function saveSite() {
      post(`/admin/merkdraak-editor/navigation`, { siteKey, ...nav })
        .then(() => {
          setError("");
          toggleNotification({ type: "success", message: "Menu en footer opgeslagen." });
        })
        .catch(() => {
          setError("De site kon niet worden opgeslagen.");
          toggleNotification({ type: "danger", message: "De site kon niet worden opgeslagen." });
        });
    }
    function textField(name: string, label: string, value: string, onChange: (value: string) => void) {
      return (
        <Field.Root name={name}>
          <Field.Label>{label}</Field.Label>
          <TextInput name={name} value={value} onChange={(event) => onChange(event.target.value)} />
        </Field.Root>
      );
    }
    function links(title: string, rows: LinkRow[], key: "footerServices" | "footerOrganization") {
      return (
        <Box paddingTop={6}>
          <Typography variant="delta" tag="h2">{title}</Typography>
          <Flex direction="column" alignItems="stretch" gap={4} paddingTop={4}>
            {rows.map((row, index) => (
              <Flex key={`${key}-${index}`} gap={4} alignItems="flex-end">
                <Box flex="1">
                  {textField(`${key}-label-${index}`, "Label", row.label ?? "", (value) => {
                    const next = [...rows];
                    next[index] = { ...row, label: value };
                    setNav({ ...nav, [key]: next });
                  })}
                </Box>
                <Box flex="1">
                  {textField(`${key}-href-${index}`, "Link", row.href ?? "", (value) => {
                    const next = [...rows];
                    next[index] = { ...row, href: value };
                    setNav({ ...nav, [key]: next });
                  })}
                </Box>
              </Flex>
            ))}
          </Flex>
        </Box>
      );
    }
    return (
      <Page.Main>
        <Page.Title>Menu en footer</Page.Title>
        <Layouts.Header
          title="Menu en footer"
          subtitle={site?.name ?? siteKey}
          navigationAction={<BackLink href={pagesHref} label="Pagina's" onBack={() => remember(siteKey, "")} />}
          primaryAction={<Button onClick={saveSite}>Opslaan</Button>}
        />
        <Layouts.Content>
          {error ? (
            <Box paddingBottom={4}>
              <Alert closeLabel="Sluiten" title="Opslaan mislukt" variant="danger" onClose={() => setError("")}>
                {error}
              </Alert>
            </Box>
          ) : null}
          <Box background="neutral0" hasRadius shadow="filterShadow" padding={6}>
            <Typography variant="delta" tag="h2">Contact</Typography>
            <Box paddingTop={1}>
              <Typography variant="pi" textColor="neutral600">Deze gegevens staan in de footer van de website.</Typography>
            </Box>
            <Flex direction="column" alignItems="stretch" gap={4} paddingTop={4}>
              {textField("phone", "Telefoon", nav.contact.phoneDisplay, (value) => setNav({ ...nav, contact: { ...nav.contact, phoneDisplay: value } }))}
              {textField("email", "E-mail", nav.contact.email, (value) => setNav({ ...nav, contact: { ...nav.contact, email: value } }))}
              {textField("address", "Adres", nav.contact.address, (value) => setNav({ ...nav, contact: { ...nav.contact, address: value } }))}
              {textField("articlePrefix", "Artikelbasis", nav.settings.articlePrefix, (value) => setNav({ ...nav, settings: { ...nav.settings, articlePrefix: value } }))}
              {textField("googlePlaceId", "Google Place ID", nav.settings.googlePlaceId, (value) => setNav({ ...nav, settings: { ...nav.settings, googlePlaceId: value } }))}
              {textField("formWebhook", "Webhook na formulier", nav.settings.formWebhook, (value) => setNav({ ...nav, settings: { ...nav.settings, formWebhook: value } }))}
            </Flex>
            <Box paddingTop={2}>
              <Typography variant="pi" textColor="neutral600">
                Nieuwe kennisbankartikelen krijgen de artikelbasis als vast begin van de URL. Wijzig je die, dan volgt een 301 vanaf het oude pad. Het Place ID hoort bij Google-reviews. De webhook krijgt een seintje na een formulierinzending.
              </Typography>
            </Box>
            <Box paddingTop={6}>
              <Divider />
            </Box>
            <Box paddingTop={6}>
              <Typography variant="delta" tag="h2">Menu</Typography>
              <Box paddingTop={1}>
                <Typography variant="pi" textColor="neutral600">Namen en links van het hoofdmenu.</Typography>
              </Box>
              <Flex direction="column" alignItems="stretch" gap={4} paddingTop={4}>
                {nav.items.map((item, index) => (
                  <Flex key={`${item.label}-${index}`} gap={4} alignItems="flex-end">
                    <Box flex="1">
                      {textField(`menu-label-${index}`, "Menunaam", item.label ?? "", (value) => {
                        const items = [...nav.items];
                        items[index] = { ...item, label: value };
                        setNav({ ...nav, items });
                      })}
                    </Box>
                    {item.__component === "nav.link" ? (
                      <Box flex="1">
                        {textField(`menu-key-${index}`, "Paginasleutel", item.page?.entryKey ?? "", (value) => {
                          const items = [...nav.items];
                          items[index] = { ...item, page: { entryKey: value } };
                          setNav({ ...nav, items });
                        })}
                      </Box>
                    ) : null}
                  </Flex>
                ))}
              </Flex>
            </Box>
            <Box paddingTop={6}>
              <Divider />
            </Box>
            {links("Footer diensten", nav.footerServices, "footerServices")}
            {links("Footer organisatie", nav.footerOrganization, "footerOrganization")}
          </Box>
        </Layouts.Content>
      </Page.Main>
    );
  }

  const page = pages.find((item) => item.documentId === documentId);
  const title = documentId === "nieuw" ? "Nieuwe pagina" : (page?.title ?? "Pagina");

  return (
    <Flex direction="column" alignItems="stretch" height="100dvh" background="neutral0">
      <Flex
        paddingLeft={6}
        paddingRight={6}
        paddingTop={3}
        paddingBottom={3}
        gap={3}
        alignItems="center"
        background="neutral0"
        borderColor="neutral150"
        borderStyle="solid"
        borderWidth="0 0 1px 0"
      >
        <BackLink href={`/admin/merkdraak-editor?siteKey=${encodeURIComponent(siteKey)}`} label="Pagina's" onBack={() => remember(siteKey, "")} />
        <Box paddingLeft={3} borderColor="neutral200" borderStyle="solid" borderWidth="0 0 0 1px">
          <Typography tag="h1" variant="delta" textColor="neutral800">{title}</Typography>
        </Box>
        {page?.slug !== undefined ? (
          <Box background="neutral100" hasRadius paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1}>
            <Typography variant="pi" textColor="neutral600">{page.slug ? `/${page.slug}` : "/"}</Typography>
          </Box>
        ) : null}
      </Flex>
      {error && !src ? (
        <Box padding={6}>
          <Alert closeLabel="Sluiten" title="Editor" variant="danger" onClose={() => setError("")}>{error}</Alert>
        </Box>
      ) : null}
      {src ? (
        <Box flex="1" position="relative" minHeight={0}>
          <iframe title="Bewerk pagina" src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "#fff" }} />
        </Box>
      ) : (
        <Flex flex="1" justifyContent="center" alignItems="center">
          <Loader>Editor laden…</Loader>
        </Flex>
      )}
    </Flex>
  );
}
