import { After, Given, Then, When } from '@badeball/cypress-cucumber-preprocessor';
import { z } from 'zod';
import { apiSchemas, type ApiResponseBody, type ApiSchemaName, type ApiUser } from '../../api/schemas';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type AccountPayload = Record<string, string>;

interface ApiResponse {
  status: number;
  body: ApiResponseBody;
}

/** Accounts created during a scenario, keyed by email, so the After hook can delete them. */
const createdAccounts = new Map<string, string>();

const apiUrl = (endpoint: string) => `${Cypress.expose('apiBaseUrl')}${endpoint}`;

/** How often to retry when the API returns a web page instead of JSON, and the base delay between tries. */
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

/**
 * automationexercise.com returns JSON with a `text/html` content type, so the body may arrive
 * as a string. Returns null when the body isn't JSON at all: the site sometimes answers
 * automated traffic (e.g. from CI servers) with an HTML error or bot-protection page.
 */
const parseBody = (body: unknown): ApiResponseBody | null => {
  if (typeof body !== 'string') {
    return body as ApiResponseBody;
  }
  try {
    return JSON.parse(body) as ApiResponseBody;
  } catch {
    return null;
  }
};

const pageTitle = (html: unknown): string =>
  String(html).match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || 'untitled page';

/**
 * Sends a request, retrying with a growing delay if the API returns a web page instead of
 * JSON. If it still does after MAX_ATTEMPTS, fails with a message that makes clear the
 * third-party API was unavailable, rather than a confusing JSON parse error.
 */
function requestJson (options: Partial<Cypress.RequestOptions>, attempt = 1): Cypress.Chainable<ApiResponse> {
  return cy.request(options).then((res) => {
    const body = parseBody(res.body);
    if (body) {
      return cy.wrap<ApiResponse>({ status: res.status, body }, { log: false });
    }

    const summary = `${options.method} ${options.url} returned an HTML page ("${pageTitle(res.body)}", HTTP ${res.status}) instead of JSON`;
    if (attempt >= MAX_ATTEMPTS) {
      throw new Error(`Automation Exercise API unavailable: ${summary} on ${MAX_ATTEMPTS} attempts. `
        + 'This is an outage or bot protection on the third-party API, not a failure of the behaviour under test.');
    }

    cy.log(`${summary}; retrying (attempt ${attempt + 1} of ${MAX_ATTEMPTS})`);
    // A deliberate back-off before retrying a third-party API, not a wait for the app under test.
    cy.wait(RETRY_DELAY_MS * attempt, { log: false });
    return requestJson(options, attempt + 1);
  });
}

const getAccountPayload = () => cy.get<AccountPayload>('@accountPayload');
const getApiResponse = () => cy.get<ApiResponse>('@apiResponse');

function trackAccountLifecycle (endpoint: string, payload: AccountPayload | undefined, body: ApiResponseBody) {
  if (!payload?.email) {
    return;
  }

  if (endpoint === '/createAccount' && body.responseCode === 201) {
    createdAccounts.set(payload.email, payload.password);
  }

  if (endpoint === '/deleteAccount' && body.responseCode === 200) {
    createdAccounts.delete(payload.email);
  }
}

/**
 * Sends a request and stores the parsed response under the `@apiResponse` alias.
 * GET payloads are sent as query parameters; all other methods send form-encoded bodies.
 */
function sendApiRequest (method: HttpMethod, endpoint: string, payload?: AccountPayload) {
  const isGet = method === 'GET';

  return requestJson({
    method,
    url: apiUrl(endpoint),
    form: !isGet,
    body: isGet ? undefined : payload,
    qs: isGet ? payload : undefined,
    failOnStatusCode: false,
  }).then((response) => {
    trackAccountLifecycle(endpoint, payload, response.body);

    cy.wrap<ApiResponse>(response).as('apiResponse', { type: 'static' });
  });
}

Given('I prepare a unique account payload', () => {
  const uniqueId = `${Date.now()}${Cypress._.random(1000, 9999)}`;

  cy.fixture<AccountPayload>('accountPayload').then((template) => {
    cy.wrap<AccountPayload>({
      ...template,
      email: `cypress.user.${uniqueId}@example.com`,
      mobile_number: `9${uniqueId.slice(-9)}`,
    }).as('accountPayload', { type: 'static' });
  });
});

Given('I create the prepared account via API', () => {
  getAccountPayload().then((payload) => sendApiRequest('POST', '/createAccount', payload));
  getApiResponse().its('body.responseCode').should('eq', 201);
});

When(/^I send a "(GET|POST|PUT|DELETE)" request to "(.*)" with the prepared account payload$/, (method: HttpMethod, endpoint: string) => {
  getAccountPayload().then((payload) => sendApiRequest(method, endpoint, payload));
});

When(/^I send a "(GET|POST|PUT|DELETE)" request to "(.*)"$/, (method: HttpMethod, endpoint: string) => {
  sendApiRequest(method, endpoint);
});

When('I update the prepared account details', () => {
  getAccountPayload().then((payload) => {
    cy.wrap<AccountPayload>({
      ...payload,
      name: 'Updated Cypress User',
      firstname: 'Updated',
      city: 'Pune',
    }).as('accountPayload', { type: 'static' });
  });
});

When('I request the user details for the prepared account', () => {
  getAccountPayload().then(({ email }) => sendApiRequest('GET', '/getUserDetailByEmail', { email }));
});

When(/^I verify login for the prepared account with (the correct|an incorrect) password$/, (variant: string) => {
  getAccountPayload().then(({ email, password }) => {
    const attemptedPassword = variant === 'the correct' ? password : `${password}-wrong`;
    sendApiRequest('POST', '/verifyLogin', { email, password: attemptedPassword });
  });
});

When('I delete the prepared account via API', () => {
  getAccountPayload().then(({ email, password }) => sendApiRequest('DELETE', '/deleteAccount', { email, password }));
});

Then(/^the response status should be "(\d+)"$/, (statusCode: string) => {
  getApiResponse().its('status').should('eq', Number(statusCode));
});

Then(/^the API response code should be "(\d+)"$/, (apiCode: string) => {
  getApiResponse().its('body.responseCode').should('eq', Number(apiCode));
});

Then(/^the API response message should be "(.*)"$/, (message: string) => {
  getApiResponse().its('body.message').should('eq', message);
});

Then(/^the response body should match the "(message|user details)" schema$/, (schemaName: ApiSchemaName) => {
  getApiResponse().then(({ body }) => {
    const result = apiSchemas[schemaName].safeParse(body);
    const problems = result.success ? '' : `:\n${z.prettifyError(result.error)}`;

    expect(result.success, `response body matches the "${schemaName}" schema${problems}`).to.be.true;
  });
});

Then('the returned user details should match the prepared account', () => {
  getAccountPayload().then((payload) => {
    getApiResponse().its('body.user').should((user: ApiUser) => {
      expect(user, 'user details').to.include({
        name: payload.name,
        email: payload.email,
        first_name: payload.firstname,
        last_name: payload.lastname,
        city: payload.city,
      });
    });
  });
});

/** Removes any accounts left behind (e.g. by a failed scenario) so the shared demo API is not polluted. */
After({ tags: '@api' }, () => {
  createdAccounts.forEach((password, email) => {
    cy.request({
      method: 'DELETE',
      url: apiUrl('/deleteAccount'),
      form: true,
      body: { email, password },
      failOnStatusCode: false,
      log: false,
    });
  });
  createdAccounts.clear();
});
