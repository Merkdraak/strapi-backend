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
  Typography,
} from "@strapi/design-system";

type Settings = {
  enabled: boolean;
  cloudProjectId: string;
  siteKey: string;
  secretKey: string;
  minScore: number;
};

const emptySettings: Settings = {
  enabled: true,
  cloudProjectId: "",
  siteKey: "",
  secretKey: "",
  minScore: 0.5,
};

export default function RecaptchaSettingsPage() {
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [configured, setConfigured] = useState(false);

  function load() {
    setLoading(true);
    return get("/admin/merkdraak-recaptcha/settings")
      .then((response: { data?: { settings?: Settings; configured?: boolean } }) => {
        setSettings({ ...emptySettings, ...(response.data?.settings ?? {}) });
        setConfigured(Boolean(response.data?.configured));
      })
      .catch(() => {
        toggleNotification({ type: "danger", message: "reCAPTCHA-instellingen konden niet worden geladen." });
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [get]);

  async function save() {
    setSaving(true);
    try {
      const response = await put("/admin/merkdraak-recaptcha/settings", settings);
      setSettings({ ...emptySettings, ...(response.data?.settings ?? settings) });
      setConfigured(Boolean(response.data?.configured));
      toggleNotification({ type: "success", message: "reCAPTCHA-instellingen opgeslagen." });
    } catch {
      toggleNotification({ type: "danger", message: "Opslaan mislukt." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page.Main>
      <Page.Title>reCAPTCHA</Page.Title>
      <Layouts.Header
        title="reCAPTCHA"
        subtitle="Google reCAPTCHA v3 voor contact-, scan- en sollicitatieformulieren. Sitesleutel is publiek; geheime sleutel blijft server-side."
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
            {configured && settings.enabled ? (
              <Alert closeLabel="Sluiten" title="reCAPTCHA actief" variant="success">
                Formulieren gebruiken reCAPTCHA v3 met minimale score {settings.minScore}.
              </Alert>
            ) : configured && !settings.enabled ? (
              <Alert closeLabel="Sluiten" title="reCAPTCHA uitgeschakeld" variant="warning">
                Keys staan klaar, maar controle is uitgeschakeld.
              </Alert>
            ) : (
              <Alert closeLabel="Sluiten" title="Nog niet geconfigureerd" variant="warning">
                Vul sitesleutel en geheime sleutel in om spamcontrole te activeren.
              </Alert>
            )}

            <Box background="neutral0" padding={6} hasRadius shadow="filterShadow">
              <Flex direction="column" gap={4} alignItems="stretch">
                <Typography variant="delta">Algemeen</Typography>
                <SingleSelect
                  label="Status"
                  value={settings.enabled ? "true" : "false"}
                  onChange={(value: string | number) =>
                    setSettings((current) => ({ ...current, enabled: String(value) === "true" }))
                  }
                >
                  <SingleSelectOption value="true">Aan</SingleSelectOption>
                  <SingleSelectOption value="false">Uit</SingleSelectOption>
                </SingleSelect>
                <Field.Root hint="Optioneel. Google Cloud project-ID (handig bij reCAPTCHA Enterprise / Cloud Console).">
                  <Field.Label>Google Cloud project-ID</Field.Label>
                  <TextInput
                    value={settings.cloudProjectId}
                    onChange={(event: { target: { value: string } }) =>
                      setSettings((current) => ({ ...current, cloudProjectId: event.target.value }))
                    }
                  />
                  <Field.Hint />
                </Field.Root>
                <Field.Root hint="0.0 (streng) tot 1.0 (soepel). Standaard 0.5 voor reCAPTCHA v3.">
                  <Field.Label>Minimale score</Field.Label>
                  <TextInput
                    type="number"
                    value={String(settings.minScore)}
                    onChange={(event: { target: { value: string } }) =>
                      setSettings((current) => ({
                        ...current,
                        minScore: Number(event.target.value),
                      }))
                    }
                  />
                  <Field.Hint />
                </Field.Root>
              </Flex>
            </Box>

            <Box background="neutral0" padding={6} hasRadius shadow="filterShadow">
              <Flex direction="column" gap={4} alignItems="stretch">
                <Typography variant="delta">Keys</Typography>
                <Field.Root hint="Publieke sleutel (site key) uit Google reCAPTCHA.">
                  <Field.Label>Sitesleutel</Field.Label>
                  <TextInput
                    value={settings.siteKey}
                    onChange={(event: { target: { value: string } }) =>
                      setSettings((current) => ({ ...current, siteKey: event.target.value }))
                    }
                  />
                  <Field.Hint />
                </Field.Root>
                <Field.Root hint="Geheime sleutel blijft privé (niet zichtbaar op de publieke site-API).">
                  <Field.Label>Geheime sleutel</Field.Label>
                  <TextInput
                    type="password"
                    value={settings.secretKey}
                    onChange={(event: { target: { value: string } }) =>
                      setSettings((current) => ({ ...current, secretKey: event.target.value }))
                    }
                  />
                  <Field.Hint />
                </Field.Root>
              </Flex>
            </Box>
          </Flex>
        )}
      </Layouts.Content>
    </Page.Main>
  );
}
