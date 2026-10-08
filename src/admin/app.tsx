import type { StrapiApp } from "@strapi/strapi/admin";
import { Navigate, useLocation } from "react-router-dom";

function isContentManagerPath(path: string | undefined) {
  return path === "content-manager" || Boolean(path?.startsWith("content-manager/") || path?.startsWith("content-manager*"));
}

function EditorRedirect() {
  const path = useLocation().pathname;
  const page = path.match(/collection-types\/api::page\.page\/([^/]+)/);
  const caseDoc = path.match(/collection-types\/api::case\.case\/([^/]+)/);
  const documentId = page?.[1] ?? caseDoc?.[1];
  if (caseDoc && documentId === "create") {
    return <Navigate to="/merkdraak-editor?siteKey=merkdraak&documentId=case-nieuw" replace />;
  }
  if (documentId === "create") {
    return <Navigate to="/merkdraak-editor?siteKey=merkdraak&documentId=nieuw" replace />;
  }
  if (documentId) {
    return <Navigate to={`/merkdraak-editor?siteKey=merkdraak&documentId=${encodeURIComponent(documentId)}`} replace />;
  }
  return <Navigate to="/merkdraak-editor?siteKey=merkdraak" replace />;
}

function hideDefaultEditor(app: StrapiApp) {
  const menu = app.router.menu;
  for (let index = menu.length - 1; index >= 0; index -= 1) {
    if (isContentManagerPath(menu[index].to)) menu.splice(index, 1);
  }
  const routes = app.router.routes;
  for (let index = routes.length - 1; index >= 0; index -= 1) {
    if (isContentManagerPath(routes[index].path)) routes.splice(index, 1);
  }
  app.router.addRoute({
    path: "content-manager/*",
    element: <EditorRedirect />,
  });
  app.widgets.register((widgets) => widgets.filter((widget) => widget.pluginId !== "content-manager"));
}

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
  register(app: StrapiApp) {
    hideDefaultEditor(app);
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
