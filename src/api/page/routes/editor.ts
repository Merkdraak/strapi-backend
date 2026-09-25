export default {
  routes: [
    {
      method: "GET",
      path: "/editor/pages",
      handler: "page.editorList",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/editor/page",
      handler: "page.editorRead",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/editor/save",
      handler: "page.editorSave",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/editor/media",
      handler: "page.editorMedia",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/editor/media",
      handler: "page.editorMedia",
      config: { auth: false },
    },
  ],
};
