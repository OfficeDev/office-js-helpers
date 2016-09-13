# OfficeJS Helpers

OfficeJS Helpers are a collection of helpers to ease development of Office Add-ins. These helpers address features as Storage Management, Authentication, helpful utilities etc.

The current version includes:
1. [Authentication](#authentication)
2. Storage Management

## Getting Started

### Prerequisites

#### Production
If you wish to consume the library then you will need the following to get up and running:

1. Clone the project or download it to your machine.
2. Copy the contents of the `dist` folder to your Add-in project.
3. The `office-js-helpers.js` file contains the code for all the helpers listed in the `src` folder.
4. The `office-js-helpers.d.ts` is required for intellisense when using any editor capable of working with `d.ts` files.
5. You will need a ES6 Shim library to enable ES6 features such as Promises, Maps etc inside of Add-ins. You can use any library of your choice or use [core-js](https://github.com/zloirock/core-js).

Reference the library inside of your `.html` page using:
```html
<!-- Office.js -->
<script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>

<!-- ES6 Shim of your choice -->
<script src="https://unpkg.com/core-js/client/core.min.js"></script>

<!-- OfficeJS Helpers -->
<script src="office-js-helpers.js"></script>
```

### Authentication

The Authentication helper is built for standards compliant OAuth Implicit Flow. Out of the box it directly integrates with Microsoft, Google and Facebook authentication.

> Microsoft integration uses the AzureAD AppModel v2 endpoints which uses Converged Authentication. It enables users to login using their Work, School or Personal accounts.

#### Setup
Inside of your `Office.initialize` function add the following check:

```javascript
if (OfficeJSHelpers.Authenticator.isAuthDialog()) return;
```

This to inform the Authenticator to automatically close the authentication dialog once the authentication is complete.

#### Initialize
Create a new instance of `Authenticator` and register the endpoints. An endpoint corresponds to a service that allows the user to authenticate with.

```javascript
var authenticator = new OfficeJSHelpers.Authenticator();

// register Microsoft endpoint using
authenticator.endpoints.registerMicrosoftAuth('client id here');

// register Google endpoint using
authenticator.endpoints.registerGoogleAuth('client id here');

// register Facebook endpoint using
authenticator.endpoints.registerFacebookAuth('client id here');

// register any 3rd Pary OAuth Implicit Provider using
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
    .catch(function(error) { /* handle error here */ });

// for the default Microsoft endpoint
authenticator
    .authenticate(OfficeJSHelpers.DefaultEndpoints.Microsoft)
    .then(function (token) { /* Microsoft Token */ })
    .catch(function(error) { /* handle error here */ });

// for the default Google endpoint
authenticator
    .authenticate(OfficeJSHelpers.DefaultEndpoints.Google)
    .then(function (token) { /* Google Token */ })
    .catch(function(error) { /* handle error here */ });

// for the default Facebook endpoint
authenticator
    .authenticate(OfficeJSHelpers.DefaultEndpoints.Facebook)
    .then(function (token) { /* Facebook Token */ })
    .catch(function(error) { /* handle error here */ });
```

#### Getting a cached token
By default the tokens are cached to the LocalStorage and upon expiry the AuthDialog is invoked again. You can also pass the `force` parameter as `true` as the second input to `authenticator.authenticate()` to re-authenticate the user.

```javascript
authenticator
    .authenticate('name of endpoint')
    .then(function(token) { /*
        `token` is either cached or newly obtained upon expiry.
    */ });

authenticator
    .authenticate('name of endpoint', true /* force re-authentication */)
    .then(function(token) { /*
        `token` is newly obtained.
    */ });

// get the cached token if any. returns null otherwise.
var token = authenticator.tokens.get('name of endpoint');
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags).

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
