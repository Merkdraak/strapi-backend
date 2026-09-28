export default {
  routes: [
    {
      method: "POST",
      path: "/form-submissions/submit",
      handler: "form-submission.submit",
      config: { auth: false },
    },
  ],
};
