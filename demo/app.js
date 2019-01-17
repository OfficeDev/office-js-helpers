/// <reference path="../dist/office.helpers.d.ts" />

(function ($) {
  // Just a random helper to prettify json
  function prettify(data) {
    let json = JSON.stringify(data);
    json = json.replace(/{/g, "{\n\n\t");
    json = json.replace(/,/g, ",\n\t");
    json = json.replace(/}/g, ",\n\n}");
    return json;
  }

  $("document").ready(function () {
    // Determine if we are running inside of an authentication dialog
    // If so then just terminate the running function
    if (OfficeHelpers.Authenticator.isAuthDialog()) {
      // Adding code here isn"t guaranteed to run as we need to close the dialog
      // Currently we have no realistic way of determining when the dialog is completely
      // closed.
      return;
    }

    // Create a new instance of Authenticator
    let authenticator = new OfficeHelpers.Authenticator();
    
    // Register our providers accordingly
    authenticator.endpoints.registerMicrosoftAuth("f59e8034-6e3c-4ba6-9fb5-1342d27d0123");
    authenticator.endpoints.registerDropboxAuth("tkvf431lh8d9hci");

    // Get the output pre
    let output = $("#output");

    // Add event handlers to the buttons
    $(".login").click(function () {
      let provider = $(this).data("provider");
      output.text("Authenticating with " + provider + "...");

      // Authenticate with the chosen provider
      authenticator.authenticate(provider, true /* setting the force to true, always re-authenticates. This is just for demo purposes */)
        .then(function (token) {
          // Consume the access token
          output.text(prettify(token));
        })
        .catch(function (error) {
          // Handle the error
          output.text(prettify(error));
        });
    });
  });
})(jQuery);