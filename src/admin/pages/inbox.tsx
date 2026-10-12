import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Layouts, Page, useFetchClient, useNotification } from "@strapi/strapi/admin";
import {
  Badge,
  Box,
  Button,
  Flex,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from "@strapi/design-system";
import { ArrowLeft } from "@strapi/icons";

type InboxItem = {
  documentId: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  companyUrl: string;
  socialMedia: string;
  vacancyTitle: string;
  attachments: string;
  message: string;
  interest: string;
  requestType: string;
  requestTypeLabel: string;
  sourcePath: string;
  status: string;
  teamMailStatus: string;
  visitorMailStatus: string;
  mailError: string;
  createdAt: string;
};

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Flex direction="column" gap={1} alignItems="stretch">
      <Typography tag="div" fontWeight="bold">
        {label}
      </Typography>
      <Typography tag="div">{children}</Typography>
    </Flex>
  );
}

const typeFilters = [
  { value: "all", label: "Alle" },
  { value: "contact", label: "Contact" },
  { value: "seo", label: "SEO" },
  { value: "sea", label: "SEA" },
  { value: "cro", label: "CRO" },
  { value: "general", label: "Algemeen" },
  { value: "social", label: "Social" },
  { value: "website", label: "Website" },
  { value: "vacancy", label: "Sollicitatie" },
];

const statusFilters = [
  { value: "all", label: "Alle statussen" },
  { value: "nieuw", label: "Nieuw" },
  { value: "gelezen", label: "Gelezen" },
  { value: "afgehandeld", label: "Afgehandeld" },
];

function formatWhen(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mailLabel(value: string) {
  if (value === "sent") return "Verzonden";
  if (value === "skipped") return "Overgeslagen";
  if (value === "failed") return "Mislukt";
  return "In behandeling";
}

export default function InboxPage() {
  const { get, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("id") ?? "";
  const [requestType, setRequestType] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [detail, setDetail] = useState<InboxItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const query = useMemo(() => {
    const search = new URLSearchParams();
    search.set("pageSize", "50");
    if (requestType && requestType !== "all") search.set("requestType", requestType);
    if (status && status !== "all") search.set("status", status);
    return search.toString();
  }, [requestType, status]);

  function loadList() {
    setLoading(true);
    return get(`/admin/merkdraak-mail/inbox?${query}`)
      .then((response: { data?: { items?: InboxItem[]; newCount?: number } }) => {
        setItems(response.data?.items ?? []);
        setNewCount(response.data?.newCount ?? 0);
      })
      .catch(() => {
        toggleNotification({ type: "danger", message: "Inzendingen konden niet worden geladen." });
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadList();
  }, [get, query]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    get(`/admin/merkdraak-mail/inbox/${encodeURIComponent(selectedId)}`)
      .then((response: { data?: { item?: InboxItem } }) => {
        setDetail(response.data?.item ?? null);
        loadList();
      })
      .catch(() => {
        toggleNotification({ type: "danger", message: "Inzending kon niet worden geopend." });
        setDetail(null);
      })
      .finally(() => setDetailLoading(false));
  }, [get, selectedId]);

  async function updateStatus(next: string) {
    if (!detail) return;
    try {
      const response = await post(`/admin/merkdraak-mail/inbox/${encodeURIComponent(detail.documentId)}/status`, {
        status: next,
      });
      setDetail(response.data?.item ?? detail);
      await loadList();
      toggleNotification({ type: "success", message: "Status bijgewerkt." });
    } catch {
      toggleNotification({ type: "danger", message: "Status kon niet worden bijgewerkt." });
    }
  }

  return (
    <Page.Main>
      <Page.Title>Inkomende mails</Page.Title>
      <Layouts.Header
        title="Inkomende mails"
        subtitle={newCount > 0 ? `${newCount} nieuw` : "Formulierinzendingen"}
        navigationAction={
          selectedId ? (
            <Button variant="tertiary" startIcon={<ArrowLeft />} onClick={() => setParams({})}>
              Terug naar overzicht
            </Button>
          ) : undefined
        }
      />
      <Layouts.Content>
        {selectedId ? (
          <Box background="neutral0" padding={6} hasRadius shadow="filterShadow">
            {detailLoading || !detail ? (
              <Typography>Laden…</Typography>
            ) : (
              <Flex direction="column" gap={4} alignItems="stretch">
                <Flex justifyContent="space-between" alignItems="center" wrap="wrap" gap={3}>
                  <Box>
                    <Typography variant="alpha">{detail.name}</Typography>
                    <Typography textColor="neutral600">
                      {detail.requestTypeLabel} · {formatWhen(detail.createdAt)}
                    </Typography>
                  </Box>
                  <Flex gap={2}>
                    <Badge>{detail.status}</Badge>
                    <SingleSelect
                      value={detail.status}
                      onChange={(value: string | number) => updateStatus(String(value))}
                      placeholder="Status"
                    >
                      <SingleSelectOption value="nieuw">Nieuw</SingleSelectOption>
                      <SingleSelectOption value="gelezen">Gelezen</SingleSelectOption>
                      <SingleSelectOption value="afgehandeld">Afgehandeld</SingleSelectOption>
                    </SingleSelect>
                  </Flex>
                </Flex>
                {detail.vacancyTitle ? (
                  <DetailField label="Vacature">{detail.vacancyTitle}</DetailField>
                ) : null}
                {detail.companyName ? (
                  <DetailField label="Bedrijfsnaam">{detail.companyName}</DetailField>
                ) : null}
                {detail.companyUrl ? (
                  <DetailField label="Website">
                    <a href={detail.companyUrl} target="_blank" rel="noreferrer">
                      {detail.companyUrl}
                    </a>
                  </DetailField>
                ) : null}
                {detail.socialMedia ? (
                  <DetailField label="Social media">
                    <span style={{ whiteSpace: "pre-wrap" }}>{detail.socialMedia}</span>
                  </DetailField>
                ) : null}
                <DetailField label="E-mail">
                  <a href={`mailto:${detail.email}`}>{detail.email}</a>
                </DetailField>
                {detail.phone ? <DetailField label="Telefoon">{detail.phone}</DetailField> : null}
                <DetailField label="Bronpagina">{detail.sourcePath || "-"}</DetailField>
                <DetailField label={detail.vacancyTitle ? "Motivatie" : "Bericht"}>
                  <span style={{ whiteSpace: "pre-wrap" }}>{detail.message}</span>
                </DetailField>
                {detail.attachments ? (
                  <DetailField label="Bijlagen">
                    <span style={{ whiteSpace: "pre-wrap" }}>{detail.attachments}</span>
                  </DetailField>
                ) : null}
                <Flex direction="column" gap={1} alignItems="stretch">
                  <Typography tag="div" fontWeight="bold">
                    Mailstatus
                  </Typography>
                  <Typography tag="div">
                    Team: {mailLabel(detail.teamMailStatus)} · Bevestiging: {mailLabel(detail.visitorMailStatus)}
                  </Typography>
                  {detail.mailError ? (
                    <Typography tag="div" textColor="danger600">
                      ⚠ {detail.mailError}
                    </Typography>
                  ) : null}
                </Flex>
              </Flex>
            )}
          </Box>
        ) : (
          <Flex direction="column" gap={4} alignItems="stretch">
            <Flex gap={3} wrap="wrap">
              <Box style={{ minWidth: 160 }}>
                <Typography variant="pi" fontWeight="bold">
                  Type
                </Typography>
                <Box marginTop={1}>
                  <SingleSelect
                    value={requestType}
                    onChange={(value: string | number) => {
                      const next = value == null || value === "" ? "all" : String(value);
                      setRequestType(next);
                    }}
                    placeholder="Alle"
                  >
                    {typeFilters.map((item) => (
                      <SingleSelectOption key={item.value} value={item.value}>
                        {item.label}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Box>
              </Box>
              <Box style={{ minWidth: 180 }}>
                <Typography variant="pi" fontWeight="bold">
                  Status
                </Typography>
                <Box marginTop={1}>
                  <SingleSelect
                    value={status}
                    onChange={(value: string | number) => {
                      const next = value == null || value === "" ? "all" : String(value);
                      setStatus(next);
                    }}
                    placeholder="Alle statussen"
                  >
                    {statusFilters.map((item) => (
                      <SingleSelectOption key={item.value} value={item.value}>
                        {item.label}
                      </SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Box>
              </Box>
            </Flex>
            <Box background="neutral0" hasRadius shadow="filterShadow" padding={2}>
              {loading ? (
                <Box padding={4}>
                  <Typography>Laden…</Typography>
                </Box>
              ) : items.length === 0 ? (
                <Box padding={4}>
                  <Typography>
                    {requestType !== "all" || status !== "all"
                      ? "Geen inzendingen voor deze filters. Kies Type “Alle” om alles te zien."
                      : "Nog geen formulierinzendingen."}
                  </Typography>
                </Box>
              ) : (
                <Flex direction="column" alignItems="stretch">
                  <Flex padding={3} gap={3} style={{ borderBottom: "1px solid #ddd" }}>
                    <Box style={{ flex: 2 }}>
                      <Typography fontWeight="bold">Naam</Typography>
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <Typography fontWeight="bold">Type</Typography>
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <Typography fontWeight="bold">Status</Typography>
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <Typography fontWeight="bold">Datum</Typography>
                    </Box>
                  </Flex>
                  {items.map((item) => (
                    <Box
                      key={item.documentId}
                      padding={3}
                      style={{ borderBottom: "1px solid #eee", cursor: "pointer" }}
                      onClick={() => navigate(`/merkdraak-inbox?id=${encodeURIComponent(item.documentId)}`)}
                    >
                      <Flex gap={3} alignItems="center">
                        <Box style={{ flex: 2, minWidth: 0 }}>
                          <Typography fontWeight="semiBold" ellipsis>
                            {item.name}
                          </Typography>
                          <Typography variant="pi" textColor="neutral600" ellipsis>
                            {item.email}
                          </Typography>
                        </Box>
                        <Box style={{ flex: 1 }}>
                          <Typography>{item.requestTypeLabel}</Typography>
                        </Box>
                        <Box style={{ flex: 1 }}>
                          <Badge active={item.status === "nieuw"}>{item.status}</Badge>
                        </Box>
                        <Box style={{ flex: 1 }}>
                          <Typography variant="pi">{formatWhen(item.createdAt)}</Typography>
                        </Box>
                      </Flex>
                    </Box>
                  ))}
                </Flex>
              )}
            </Box>
          </Flex>
        )}
      </Layouts.Content>
    </Page.Main>
  );
}
