import { useEffect, useState } from "react";
import { Layouts, Page, useFetchClient, useNotification } from "@strapi/strapi/admin";
import {
  Alert,
  Box,
  Button,
  Field,
  Flex,
  SingleSelect,
  SingleSelectOption,
  TextInput,
  Switch,
  Typography,
} from "@strapi/design-system";

type ProviderRow = {
  id: string;
  label: string;
  configured: boolean;
  missing: string[];
};

type Settings = {
  provider: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  defaultRecipient: string;
  sendVisitorConfirmation: boolean;
  sendTeamNotification: boolean;
  teamSubject: string;
  teamIntro: string;
  teamOutro: string;
  visitorSubject: string;
  visitorIntro: string;
  visitorOutro: string;
};

const emptySettings: Settings = {
  provider: "smtp",
  fromName: "Merkdraak",
  fromEmail: "noreply@merkdraak.nl",
  replyTo: "info@merkdraak.nl",
  defaultRecipient: "",
  sendVisitorConfirmation: true,
  sendTeamNotification: true,
  teamSubject: "",
  teamIntro: "",
  teamOutro: "",
  visitorSubject: "",
  visitorIntro: "",
  visitorOutro: "",
};

export default function EmailSettingsPage() {
  const { get, put, post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [warning, setWarning] = useState("");
  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; detail?: string } | null>(null);

  function load() {
    setLoading(true);
    return get("/admin/merkdraak-mail/settings")
      .then(
        (response: {
          data?: {
            settings?: Settings;
            providers?: ProviderRow[];
            activeProvider?: { warning?: string };
          };
        }) => {
          setSettings({ ...emptySettings, ...(response.data?.settings ?? {}) });
          setProviders(response.data?.providers ?? []);
          setWarning(response.data?.activeProvider?.warning ?? "");
        },
      )
      .catch(() => {
        toggleNotification({ type: "danger", message: "E-mailinstellingen konden niet worden geladen." });
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [get]);

  async function save() {
    setSaving(true);
    setTestResult(null);
    try {
      const response = await put("/admin/merkdraak-mail/settings", settings);
      setSettings({ ...emptySettings, ...(response.data?.settings ?? settings) });
      setWarning(response.data?.activeProvider?.warning ?? "");
      toggleNotification({ type: "success", message: "E-mailinstellingen opgeslagen." });
      await load();
    } catch {
      toggleNotification({ type: "danger", message: "Opslaan mislukt." });
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await post("/admin/merkdraak-mail/test", { to: testTo });
      setTestResult({
        ok: true,
        message: response.data?.message ?? "Testmail succesvol verstuurd.",
      });
    } catch (error: unknown) {
      const payload = error as { response?: { data?: { message?: string; detail?: string } } };
      setTestResult({
        ok: false,
        message: payload.response?.data?.message ?? "Mail kon niet worden verstuurd.",
        detail: payload.response?.data?.detail,
      });
    } finally {
      setTesting(false);
    }
  }

  const active = providers.find((item) => item.id === settings.provider);

  return (
    <Page.Main>
      <Page.Title>E-mail</Page.Title>
      <Layouts.Header
        title="E-mail"
        subtitle="Provider, afzender en formuliermails. Secrets blijven in environment variables."
        primaryAction={
          <Button onClick={save} loading={saving} disabled={loading}>
            Opslaan
          </Button>
        }
      />
      <Layouts.Content>
        {loading ? (
          <Typography>Laden…</Typography>
        ) : (
          <Flex direction="column" gap={6} alignItems="stretch">
            {warning ? (
              <Alert closeLabel="Sluiten" title="Provider niet compleet" variant="warning">
                {warning}
              </Alert>
            ) : (
              <Alert closeLabel="Sluiten" title="Provider gereed" variant="success">
                {active?.label ?? settings.provider}: credentials geconfigureerd.
              </Alert>
            )}

            <Box background="neutral0" padding={6} hasRadius shadow="filterShadow">
              <Flex direction="column" gap={4} alignItems="stretch">
                <Typography variant="delta">Provider</Typography>
                <SingleSelect
                  label="Mailprovider"
                  value={settings.provider}
                  onChange={(value: string | number) => setSettings((current) => ({ ...current, provider: String(value) }))}
                >
                  {providers.map((item) => (
                    <SingleSelectOption key={item.id} value={item.id}>
                      {item.label}
                      {item.configured ? " ✓" : " ⚠"}
                    </SingleSelectOption>
                  ))}
                </SingleSelect>
                {active ? (
                  <Typography textColor="neutral600">
                    {active.configured
                      ? `${active.label} API key / credentials: ✓ Geconfigureerd`
                      : `⚠ Ontbrekende env-vars: ${active.missing.join(", ")}`}
                  </Typography>
                ) : null}
              </Flex>
            </Box>

            <Box background="neutral0" padding={6} hasRadius shadow="filterShadow">
              <Flex direction="column" gap={4} alignItems="stretch">
                <Typography variant="delta">Afzender & ontvangers</Typography>
                <Field.Root>
                  <Field.Label>Afzendernaam</Field.Label>
                  <TextInput
                    value={settings.fromName}
                    onChange={(event: { target: { value: string } }) =>
                      setSettings((current) => ({ ...current, fromName: event.target.value }))
                    }
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Afzender e-mail</Field.Label>
                  <TextInput
                    type="email"
                    value={settings.fromEmail}
                    onChange={(event: { target: { value: string } }) =>
                      setSettings((current) => ({ ...current, fromEmail: event.target.value }))
                    }
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Reply-to</Field.Label>
                  <TextInput
                    type="email"
                    value={settings.replyTo}
                    onChange={(event: { target: { value: string } }) =>
                      setSettings((current) => ({ ...current, replyTo: event.target.value }))
                    }
                  />
                </Field.Root>
                <Field.Root hint="Fallback als pagina/scan geen ontvanger heeft.">
                  <Field.Label>Standaard ontvanger formulieren</Field.Label>
                  <TextInput
                    type="email"
                    value={settings.defaultRecipient}
                    onChange={(event: { target: { value: string } }) =>
                      setSettings((current) => ({ ...current, defaultRecipient: event.target.value }))
                    }
                  />
                  <Field.Hint />
                </Field.Root>
                <Flex gap={6} wrap="wrap">
                  <Switch
                    checked={settings.sendTeamNotification}
                    onCheckedChange={(checked: boolean) =>
                      setSettings((current) => ({ ...current, sendTeamNotification: checked }))
                    }
                    visibleLabels
                    onLabel="Teamnotificatie aan"
                    offLabel="Teamnotificatie uit"
                  />
                  <Switch
                    checked={settings.sendVisitorConfirmation}
                    onCheckedChange={(checked: boolean) =>
                      setSettings((current) => ({ ...current, sendVisitorConfirmation: checked }))
                    }
                    visibleLabels
                    onLabel="Bevestigingsmail aan"
                    offLabel="Bevestigingsmail uit"
                  />
                </Flex>
              </Flex>
            </Box>

            <Box background="neutral0" padding={6} hasRadius shadow="filterShadow">
              <Flex direction="column" gap={4} alignItems="stretch">
                <Typography variant="delta">Teamnotificatie</Typography>
                <Field.Root hint="Placeholders: {{type}} {{name}} {{site}} {{sourcePath}}">
                  <Field.Label>Onderwerp</Field.Label>
                  <TextInput
                    value={settings.teamSubject}
                    onChange={(event: { target: { value: string } }) =>
                      setSettings((current) => ({ ...current, teamSubject: event.target.value }))
                    }
                  />
                  <Field.Hint />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Intro</Field.Label>
                  <TextInput
                    value={settings.teamIntro}
                    onChange={(event: { target: { value: string } }) =>
                      setSettings((current) => ({ ...current, teamIntro: event.target.value }))
                    }
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>Outro</Field.Label>
                  <TextInput
                    value={settings.teamOutro}
                    onChange={(event: { target: { value: string } }) =>
                      setSettings((current) => ({ ...current, teamOutro: event.target.value }))
                    }
                  />
                </Field.Root>
              </Flex>
            </Box>

            <Box background="neutral0" padding={6} hasRadius shadow="filterShadow">
              <Flex direction="column" gap={2} alignItems="stretch">
                <Typography variant="delta">Bevestiging bezoeker</Typography>
                <Typography>
                  De tekst staat vast. Een scanaanvraag krijgt de scanbevestiging, een contactaanvraag de contactbevestiging. De schakelaar hierboven zet beide mails aan of uit.
                </Typography>
              </Flex>
            </Box>

            <Box background="neutral0" padding={6} hasRadius shadow="filterShadow">
              <Flex direction="column" gap={4} alignItems="stretch">
                <Typography variant="delta">Testmail</Typography>
                <Field.Root>
                  <Field.Label>E-mailadres</Field.Label>
                  <TextInput
                    type="email"
                    value={testTo}
                    onChange={(event: { target: { value: string } }) => setTestTo(event.target.value)}
                  />
                </Field.Root>
                <Flex>
                  <Button onClick={sendTest} loading={testing} disabled={!testTo.trim()}>
                    Testmail versturen
                  </Button>
                </Flex>
                {testResult ? (
                  <Alert
                    closeLabel="Sluiten"
                    title={testResult.ok ? "Geslaagd" : "Mislukt"}
                    variant={testResult.ok ? "success" : "danger"}
                  >
                    {testResult.message}
                    {testResult.detail ? ` ${testResult.detail}` : ""}
                  </Alert>
                ) : null}
              </Flex>
            </Box>
          </Flex>
        )}
      </Layouts.Content>
    </Page.Main>
  );
}
