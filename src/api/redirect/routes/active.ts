export default {
  routes: [
    {
      method: "GET",
      path: "/redirects/active",
      handler: "redirect.active",
      config: { auth: false },
    },
  ],
};
