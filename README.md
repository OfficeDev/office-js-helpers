# Office JavaScript API Helpers

[![Build Status](https://travis-ci.org/OfficeDev/office-js-helpers.svg?branch=master)](https://travis-ci.org/OfficeDev/office-js-helpers)
[![npm version](https://badge.fury.io/js/%40microsoft%2Foffice-js-helpers.svg)](https://img.shields.io/npm/v/@microsoft/office-js-helpers.svg)
[![dependencies](https://david-dm.org/officedev/office-js-helpers.svg)](https://david-dm.org/officedev/office-js-helpers)
[![downloads](https://img.shields.io/npm/dt/@microsoft/office-js-helpers.svg)]()

A collection of helpers to simplify development of Office Add-ins & Microsoft Teams Tabs. These helpers address features as Storage Management, Authentication, Dialogs and other helpful utilities etc.

The current version includes the following helpers:
- [Authentication](#authentication)
- Dialogs
- Error Logging
- Storage Helpers
- Dictionary

## Getting Started

### Installation

#### Development
> This assumes you are using npm as your package manager.

To install the stable version:

`npm install --save @microsoft/office-js-helpers`

#### Production

You can access [these files on unpkg](https://unpkg.com/@microsoft/office-js-helpers@1.0.0/dist/office.helpers.min.js), download them, or point your package manager to them.

You can also get the latest version from the [releases](https://github.com/OfficeDev/office-js-helpers/releases) tab

## Usage

### JavaScript

Reference the library inside of your `.html` page using:
```html
<!-- Office.js -->
<script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>

<!-- ES6 Shim of your choice -->
<script src="https://unpkg.com/core-js/client/core.min.js"></script>

<!-- Office JavaScript API Helpers (via CDN) -->
<script src="https://unpkg.com/@microsoft/office-js-helpers@1.0.0/dist/office.helpers.min.js"></script>

<!-- Office JavaScript API Helpers (via npm) -->
<script src="node_modules/@microsoft/office-js-helpers/dist/office.helpers.min.js"></script>

<!-- Office JavaScript API Helpers (via local) -->
<script src="office.helpers.js"></script>
```

### TypeScript

**If you are just referencing the library using a script tag** then make sure to set your `moduleResolution` to `node` in your tsconfig.json to pickup the intellisense automatically. You will need to install the package via `npm install @microsoft/office-js-helpers`.

> We will publish to DefinitelyTyped soon and then you can directly use `typings` to get access to the definitions.

**If you are using any dependency loader** such as [RequireJS](http://requirejs.org/) or [SystemJS](https://github.com/systemjs/systemjs) or module bundler such as [browserify](http://browserify.org/), [webpack](https://webpack.github.io/), you can use TypeScript `import` syntax to import specific modules. For e.g.

```typescript
import * as OfficeHelpers from '@microsoft/office-js-helpers';

import {Authenticator, DefaultEndpoints} from '@microsoft/office-js-helpers';

import {Authenticator, Storage} from '@microsoft/office-js-helpers';

import {Authenticator} from '@microsoft/office-js-helpers';
```

## Helpers

### Authentication

The Authentication helper is built for standards compliant OAuth Implicit Flow. Out of the box it directly integrates with Microsoft, AzureAD, Google and Facebook authentication.

> Microsoft integration uses the AzureAD AppModel v2 endpoints which uses Converged Authentication. It enables users to login using their Work, School or Personal accounts.

> Note on MSAL. This helper isn't a replacement for MSAL. When MSAL for JavaScript is released publicly, the helper will use MSAL.

#### For Office Add-ins
You need to meet the following requirements before you are able to successfully to use the Authenticator inside of Office Add-ins.

1. You need to use `https`. This is important as we are using OAuth Implicit Flow and it is critical to secure the communication over the wire.
2. Add the location of the provider in your `AppDomains`, example:

```xml
    <AppDomain>https://login.windows.net</AppDomain>
    <AppDomain>https://login.microsoftonline.com</AppDomain>
```

#### Setup
Inside of your `Office.initialize` function add the following check:

```javascript
if (OfficeHelpers.Authenticator.isAuthDialog()) return;
```

This to inform the Authenticator to automatically close the authentication dialog once the authentication is complete.

> Note: This code needs to be run in the page that is redirected to from the provider. By default we assume the root url of your website. The code ensures that if an access_token, code or error was received inside of the dialog, then it will parse it and close the dialog automatically. Also as an additional step it ensures that the `state` sent to the provider is the same as what was returned, to prevent [Cross Site Request Forgery (CSRF)](http://www.twobotechnologies.com/blog/2014/02/importance-of-state-in-oauth2.html).

> Note: If using in an **AngularJS/Angular/React project** - please take a look https://github.com/OfficeDev/office-js-helpers/issues/19 for information around bootstrapping your application correctly.

#### Initialize
Create a new instance of `Authenticator` and register the endpoints. An endpoint corresponds to a service that allows the user to authenticate with.

```javascript
var authenticator = new OfficeHelpers.Authenticator();

// register Microsoft (Azure AD 2.0 Converged auth) endpoint using
authenticator.endpoints.registerMicrosoftAuth('client id here');

// register Azure AD 1.0 endpoint using
authenticator.endpoints.registerAzureADAuth('client id here', 'tenant here');

// register Google endpoint using
authenticator.endpoints.registerGoogleAuth('client id here');

// register Facebook endpoint using
authenticator.endpoints.registerFacebookAuth('client id here');

// register any 3rd-Party OAuth Implicit Provider using
authenticator.endpoints.add('Name of provider', { /* Endpoint Configuration */ })

// register Microsoft endpoint by overriding default values
authenticator.endpoints.registerMicrosoftAuth('client id here', {
    redirectUrl: 'redirect url here',
    scope: 'list of valid scopes here'
});
```

#### Authentication
To authenticate against the registered endpoint, do the following:

```javascript
authenticator
    .authenticate('name of endpoint')
    .then(function(token) { /* handle success here */ })
    .catch(OfficeHelpers.Utilities.log);

// for the default Microsoft endpoint
authenticator
    .authenticate(OfficeHelpers.DefaultEndpoints.Microsoft)
    .then(function (token) { /* Microsoft Token */ })
    .catch(OfficeHelpers.Utilities.log);

// for the default AzureAD endpoint
authenticator
    .authenticate(OfficeHelpers.DefaultEndpoints.AzureAD)
    .then(function (token) { /* Microsoft Token */ })
    .catch(OfficeHelpers.Utilities.log);

// for the default Google endpoint
authenticator
    .authenticate(OfficeHelpers.DefaultEndpoints.Google)
    .then(function (token) { /* Google Token */ })
    .catch(OfficeHelpers.Utilities.log);

// for the default Facebook endpoint
authenticator
    .authenticate(OfficeHelpers.DefaultEndpoints.Facebook)
    .then(function (token) { /* Facebook Token */ })
    .catch(OfficeHelpers.Utilities.log);
```
If the user, rejects the grant to the application then you will receive an error in the `catch` function.

#### Getting a cached token
By default the tokens are cached to the LocalStorage and upon expiry the AuthDialog is invoked again. You can also pass the `force` parameter as `true` as the second input to `authenticator.authenticate()` to re-authenticate the user.

```javascript
authenticator
    .authenticate('name of endpoint')
    .then(function(token) {
    /*
        `token` is either cached or newly obtained upon expiry.
    */
    })
    .catch(OfficeHelpers.Utilities.log);

authenticator
    .authenticate('name of endpoint', true /* force re-authentication */)
    .then(function(token) {
    /*
        `token` is newly obtained.
    */
    })
    .catch(OfficeHelpers.Utilities.log);

// get the cached token if any. returns null otherwise.
var token = authenticator.tokens.get('name of endpoint');
```
If a cached token expires, then the dialog is automatically launched to re-authenticate the user.
> Note on Refresh Tokens: By default, Implicit OAuth does not support Token Refresh as a security measure. This is because Access Tokens cannot be securely stored inside of a JavaScript client.

## Contributing

Please read [Contributing](contributing.md) for details on our code of conduct, and the process for submitting pull requests to us.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information, see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/officedev/office-js-helpers/tags).

## License

This project is licensed under the MIT License - see the [License](LICENSE) file for details
