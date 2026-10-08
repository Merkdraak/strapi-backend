import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Widget, useFetchClient } from "@strapi/strapi/admin";
import { Badge, Box, Flex, Typography } from "@strapi/design-system";

type InboxItem = {
  documentId: string;
  name: string;
  email: string;
  requestTypeLabel: string;
  status: string;
  createdAt: string;
};

function formatWhen(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Vandaag ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Gisteren ${time}`;
  return date.toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function IncomingMailWidget() {
  const { get } = useFetchClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [items, setItems] = useState<InboxItem[]>([]);

  useEffect(() => {
    let active = true;
    get("/admin/merkdraak-mail/inbox?pageSize=5")
      .then((response: { data?: { newCount?: number; items?: InboxItem[] } }) => {
        if (!active) return;
        setNewCount(response.data?.newCount ?? 0);
        setItems(response.data?.items ?? []);
        setError(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [get]);

  if (loading) return <Widget.Loading />;
  if (error) return <Widget.Error>Inkomende mails konden niet worden geladen.</Widget.Error>;
  if (!items.length) return <Widget.NoData>Nog geen formulierinzendingen.</Widget.NoData>;

  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" marginBottom={3}>
        <Typography variant="omega" textColor="neutral600">
          Laatste inzendingen
        </Typography>
        {newCount > 0 ? <Badge active>{newCount} nieuw</Badge> : <Badge>0 nieuw</Badge>}
      </Flex>
      <Flex direction="column" gap={2}>
        {items.map((item) => (
          <Box
            key={item.documentId}
            padding={3}
            hasRadius
            background="neutral100"
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/merkdraak-inbox?id=${encodeURIComponent(item.documentId)}`)}
          >
            <Flex justifyContent="space-between" alignItems="flex-start" gap={3}>
              <Box style={{ minWidth: 0 }}>
                <Typography fontWeight="bold" ellipsis>
                  {item.name || "Onbekend"}
                </Typography>
                <Typography variant="pi" textColor="neutral600" ellipsis>
                  {item.requestTypeLabel} · {item.email}
                </Typography>
              </Box>
              <Typography variant="pi" textColor="neutral500" style={{ whiteSpace: "nowrap" }}>
                {formatWhen(item.createdAt)}
              </Typography>
            </Flex>
          </Box>
        ))}
      </Flex>
    </Box>
  );
}
