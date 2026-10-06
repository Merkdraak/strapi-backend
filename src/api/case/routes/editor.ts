export default {
  routes: [
    {
      method: "GET",
      path: "/editor/cases",
      handler: "case.editorList",
      config: { auth: false },
    },
    {
      method: "GET",
      path: "/editor/case",
      handler: "case.editorRead",
      config: { auth: false },
    },
  ],
};
