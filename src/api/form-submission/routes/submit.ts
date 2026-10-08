export default {
  routes: [
    {
      method: "POST",
      path: "/form-submissions/submit",
      handler: "form-submission.submit",
      config: { auth: false },
    },
    {
      method: "POST",
      path: "/form-submissions/apply",
      handler: "form-submission.apply",
      config: { auth: false },
    },
  ],
};
