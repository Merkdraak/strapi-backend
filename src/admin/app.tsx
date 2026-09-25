import type { StrapiApp } from "@strapi/strapi/admin";

const EditorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1rem" height="1rem" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

export default {
  config: {
    locales: ["nl"],
  },
  bootstrap(app: StrapiApp) {
    app.addMenuLink({
      to: "merkdraak-editor",
      icon: EditorIcon,
      intlLabel: { id: "merkdraak.editor", defaultMessage: "Websites" },
      Component: () => import("./pages/editor"),
      permissions: [],
    });
  },
};
