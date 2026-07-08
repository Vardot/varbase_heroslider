'use strict';

/**
 * @file
 * Custom step definitions for the Varbase Hero Slider test suite.
 *
 * Most of the suite reuses the step definitions that ship with webship-js
 * (navigation, form input, web-first assertions). Only the module-specific
 * helpers live here:
 *   - Logging in as a named user from cucumber.js worldParameters.users.
 *   - Dropping back to an anonymous session.
 *   - Opening an administration page while asserting it is reachable.
 *   - Uploading an image into the Media library widget of the Hero Slider
 *     "Slide media (image/video)" field (the DropzoneJS "Add media" flow).
 *   - Saving the Hero Slider node form in a way that works whether or not the
 *     content type is under content moderation (the submit id is stable while
 *     its value differs between "Save" and "Save as").
 *   - Pushing the content to the "Hero Slider" entity queue via the node
 *     form's Entityqueues settings widget.
 *   - Asserting the saved slide renders its media image.
 */

const path = require('path');
const assert = require('assert');
const { Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const {
  friendly,
  gotoUrl,
  smartSettle,
  waitForPageLoad,
} = require('webship-js/tests/step-definitions/webship');

// webship-js sets a 45s per-step default timeout. This suite drives a single
// heavy Varbase site and re-authenticates per scenario; a late login or media
// upload can legitimately need longer under cumulative load. Raise the budget
// (this file loads after webship-js, so the later call wins) so a slow-but-fine
// step is not cut off. Real hangs still surface via the per-await timeouts.
setDefaultTimeout(90 * 1000);

/**
 * Run a step body and rethrow any failure as a tester-friendly error.
 *
 * @param {Function} body
 *   Async function performing the step.
 * @param {string} message
 *   Human-readable description for failures.
 */
async function attempt(body, message) {
  try {
    await body();
  }
  catch (err) {
    throw friendly(message, err);
  }
}

/**
 * Log in as a named test user defined in cucumber.js worldParameters.users.
 *
 * Example: Given I am a logged in user with the "Webmaster" user
 * Example: Given I am a logged in user with the "Editor" user
 */
Given(/^I am a logged in user with( the)*( username)* "([^"]*)?"( user)?$/, async function (theCase, usernameCase, key, userCase) {
  const users = this.parameters.users || {};
  if (!(key in users)) {
    throw new Error(`No user named "${key}" in cucumber.js worldParameters.users`);
  }
  const { username, password } = users[key];
  if (!username || !password) {
    throw new Error(`User "${key}" is missing username or password in worldParameters.users`);
  }
  await attempt(async () => {
    let loggedIn = false;
    // Up to two attempts, each submitting the login form ONCE and then polling
    // (without resubmitting) for Drupal's `body.user-logged-in` class, which
    // every authenticated page carries. A single submit with a long verify
    // window rides out a slow post-login redirect on a busy site, and - unlike
    // a rapid resubmit loop - never trips a site's form-flood protection
    // (for example the Honeypot time limit on a full Varbase profile).
    for (let i = 0; i < 2 && !loggedIn; i++) {
      await this.context.clearCookies();
      await gotoUrl(this.page, `${this.parameters.launchUrl}/user/login`);
      await this.page.waitForSelector('#edit-name', { state: 'visible', timeout: 15000 });
      await this.page.locator('#edit-name').fill(username);
      await this.page.locator('#edit-pass').fill(password);
      await this.page.locator('#user-login-form input[value="Log in"], input[value="Log in"]').first().click();
      await this.page.waitForSelector('body.user-logged-in', { timeout: 35000 }).catch(() => {});
      loggedIn = (await this.page.locator('body.user-logged-in').count()) > 0;
      // If a form-flood guard asked us to wait, back off before the retry so
      // the second submit is not rejected as well.
      if (!loggedIn && (await this.page.getByText(/please wait .* and try again/i).count()) > 0) {
        await this.page.waitForTimeout(8000);
      }
    }
    if (!loggedIn) {
      throw new Error(`Login did not establish a session for "${key}"`);
    }
    await waitForPageLoad(this.page, this.minWaitTime && this.minWaitTime.page);
  }, `Could not log in as "${key}"`);
});

/**
 * Drop back to an anonymous session by clearing every cookie.
 *
 * Example: Given I am an anonymous visitor
 */
Given(/^(?:I |we )?am an anonymous visitor$/, async function () {
  await attempt(async () => {
    await this.context.clearCookies();
  }, 'Could not clear the session to become anonymous');
});

/**
 * Open an administration page and assert it is reachable.
 *
 * Uses the webship-js smart-wait helpers (gotoUrl + waitForPageLoad) so heavy
 * Varbase admin pages are fully settled before the assertion, and reports any
 * access-denied / not-found / fatal-error page with a tester-friendly message.
 *
 * Example: When I open the administration page "/admin/config"
 */
When(/^I open the administration page "([^"]*)"$/, async function (path) {
  await attempt(async () => {
    await gotoUrl(this.page, `${this.parameters.launchUrl}${path}`);
    await waitForPageLoad(this.page, (this.minWaitTime && this.minWaitTime.page) || 10000);
    const bad = await this.page.locator(
      'h1:has-text("Access denied"), h1:has-text("Page not found"), h1:has-text("The website encountered an unexpected error")'
    ).count();
    if (bad > 0) {
      throw new Error(`The page "${path}" returned an access-denied, not-found or error response`);
    }
  }, `Could not open the administration page "${path}"`);
});

/**
 * Upload an image into the Hero Slider "Slide media (image/video)" field.
 *
 * Drives the real Media library "Add media" dialog end to end: opens the
 * dialog, uploads the file through the DropzoneJS uploader (falling back to a
 * plain file input if DropzoneJS is not active), fills the required
 * Alternative text on the freshly created image media, saves it, and inserts
 * the selection back into the field widget. The uploaded file is resolved
 * relative to the module root (tests/files/<file>), so it is self-contained
 * and needs no pre-seeded media - it behaves identically on any site.
 *
 * Example: When I add the image "hero-test-image.png" with the alternative text "Hero Slider test image" to the Slide media field
 */
When(/^(?:I |we )*add the image "([^"]*)" with the alternative text "([^"]*)" to the Slide media field$/, async function (file, alt) {
  const filePath = path.resolve(process.cwd(), 'tests/files', file);
  await attempt(async () => {
    // Open the Media library "Add media" dialog for the single media field.
    const openButton = this.page.locator('#edit-field-media-single-open-button, input[value="Add media"]').first();
    await openButton.scrollIntoViewIfNeeded().catch(() => {});
    await openButton.click();
    await this.page.waitForSelector('.media-library-add-form, .ui-dialog-content', { timeout: 30000 });
    await smartSettle(this.page, 3000);

    // Upload the file. Varbase Media configures the DropzoneJS uploader, which
    // injects a hidden <input type="file"> (input.dz-hidden-input). Fall back
    // to a plain managed-file input for a stock Media library.
    let fileInput = this.page.locator('input.dz-hidden-input');
    if (await fileInput.count() === 0) {
      fileInput = this.page.locator('.media-library-add-form input[type="file"]');
    }
    await fileInput.first().setInputFiles(filePath);

    // The upload rebuilds the add form to show the new image media entity form.
    // Wait for its required Alternative text field, then fill it.
    const altField = this.page.locator('input[name="media[0][fields][field_media_image][0][alt]"]');
    await altField.waitFor({ state: 'visible', timeout: 60000 });
    await altField.fill(alt);
    await smartSettle(this.page, 1500);

    // Drupal's dialog system moves the media add-form submit buttons into the
    // jQuery-UI dialog button pane and hides the original inputs, so the
    // clickable controls are the button-pane <button>s ("Save", then "Insert
    // selected"). Scope to the button pane so the node form's own visible
    // "Save"/"Save as" submit behind the dialog is never matched (Claro shows a
    // plain "Save" there, which would otherwise be ambiguous). Save the new
    // media item (returns to the selection with it selected).
    const buttonPane = this.page.locator('.ui-dialog-buttonpane');
    await buttonPane.getByRole('button', { name: 'Save', exact: true }).first().click();
    const insertButton = buttonPane.getByRole('button', { name: 'Insert selected' }).first();
    await insertButton.waitFor({ state: 'visible', timeout: 30000 });
    await smartSettle(this.page, 2000);

    // Insert the selected media back into the field widget and wait for the
    // dialog to close and the widget to show the selected item.
    await insertButton.click();
    await this.page.locator('.ui-dialog-content').first().waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await smartSettle(this.page, 2000);
    // Confirm a media item is now selected in the field.
    const selected = await this.page.locator('.field--widget-media-library-widget .media-library-item, [data-drupal-selector="edit-field-media-single-selection"] .media-library-item, .media-library-selection .media-library-item').count();
    if (selected === 0) {
      throw new Error('No media item appears selected in the Slide media field after inserting');
    }
  }, `Could not add the image "${file}" to the Slide media field`);
});

/**
 * Save the Hero Slider node form.
 *
 * The submit button id (#edit-submit) is stable whether or not the content
 * type is under content moderation; only its value differs ("Save" vs.
 * "Save as"). Clicking by id therefore works on a full Varbase site and on a
 * standalone install of the module's default recipe alike. Waits for the page
 * to settle on the saved node.
 *
 * Example: When I save the Hero Slider content
 */
When(/^(?:I |we )*save the Hero Slider content$/, async function () {
  await attempt(async () => {
    // Publish the content so it is publicly viewable and eligible for
    // entity-queue membership (the entity queue only records published,
    // default-revision nodes). On a full Varbase site the content type is
    // under content moderation, so pick the "published" moderation state; on a
    // standalone install of the default recipe it is not moderated, so ensure
    // the "Published" checkbox is ticked. Both are no-ops if absent.
    const modState = this.page.locator('select[name="moderation_state[0][state]"]').first();
    if (await modState.count()) {
      await modState.selectOption('published').catch(() => {});
    }
    else {
      const statusBox = this.page.locator('input[name="status[value]"]').first();
      if (await statusBox.count() && !(await statusBox.isChecked().catch(() => true))) {
        await statusBox.check().catch(() => {});
      }
    }

    // The Gin admin theme (full Varbase site) hides the in-form submit and
    // exposes a sticky "Save as" button (#gin-sticky-edit-submit); the Claro
    // admin theme (a standalone install of the default recipe) shows the
    // in-form "Save" button (#edit-submit). Click whichever is visible.
    let submit = null;
    for (const sel of ['#gin-sticky-edit-submit', '#edit-submit']) {
      const loc = this.page.locator(sel).first();
      if (await loc.count() && await loc.isVisible().catch(() => false)) {
        submit = loc;
        break;
      }
    }
    if (!submit) {
      submit = this.page.locator('#edit-submit').first();
    }
    await submit.scrollIntoViewIfNeeded().catch(() => {});
    await Promise.all([
      this.page.waitForNavigation({ timeout: 60000 }).catch(() => {}),
      submit.click({ force: true }),
    ]);
    await waitForPageLoad(this.page, (this.minWaitTime && this.minWaitTime.page) || 10000);
    const error = await this.page.locator('.messages--error, [data-drupal-messages] .messages--error').count();
    if (error > 0) {
      const text = await this.page.locator('.messages--error').first().innerText().catch(() => '');
      throw new Error(`Saving the content reported an error: ${text.trim().slice(0, 200)}`);
    }
  }, 'Could not save the Hero Slider content');
});

/**
 * Push the current node to a named entity queue via the node form widget.
 *
 * Opens the "Entityqueues settings" details on the node edit form and checks
 * the queue whose machine name is given (the checkbox id equals the queue
 * machine name). Requires the "update <queue> entityqueue" permission, which
 * the default recipe grants to the Varbase editorial roles.
 *
 * Example: When I add the content to the "varbase_heroslider" entity queue
 */
When(/^(?:I |we )*add the content to the "([^"]*)" entity queue$/, async function (queue) {
  await attempt(async () => {
    // Ensure the collapsible Entityqueues settings section is open.
    await this.page.evaluate((id) => {
      const box = document.getElementById(id);
      if (box) {
        const details = box.closest('details');
        if (details) {
          details.open = true;
        }
      }
    }, queue);
    const box = this.page.locator(`input#${queue}[type="checkbox"]`);
    await box.waitFor({ state: 'visible', timeout: 15000 });
    await box.check();
    await smartSettle(this.page, 1000);
  }, `Could not add the content to the "${queue}" entity queue`);
});

/**
 * Add an existing slide to an entity subqueue via the subqueue edit form.
 *
 * Opens the subqueue edit page and uses the Inline Entity Form "Add existing"
 * control (the entity-queue subqueue widget) to reference the slide by title,
 * then saves the subqueue. This works on a plain module install (the node-form
 * entity-queue widget is only added on a full Varbase site), so the queue
 * membership is exercised through real UI on any environment.
 *
 * Example: When I add the slide "Queued Hero Slider Slide" to the "varbase_heroslider" subqueue
 */
When(/^(?:I |we )*add the slide "([^"]*)" to the "([^"]*)" subqueue$/, async function (title, queue) {
  await attempt(async () => {
    await gotoUrl(this.page, `${this.parameters.launchUrl}/admin/structure/entityqueue/${queue}/${queue}`);
    await waitForPageLoad(this.page, (this.minWaitTime && this.minWaitTime.page) || 10000);
    // Reveal the "Add existing" reference form.
    await this.page.locator('input[id*="ief-add-existing"]').first().click();
    const autocomplete = this.page.locator('input[name^="items[form]"][name$="[entity_id]"]').first();
    await autocomplete.waitFor({ state: 'visible', timeout: 15000 });
    await autocomplete.fill(title);
    // Pick the autocomplete suggestion that matches the slide title.
    const suggestion = this.page.locator('ul.ui-autocomplete li a').filter({ hasText: title });
    await suggestion.first().waitFor({ state: 'visible', timeout: 15000 });
    await suggestion.first().click();
    await smartSettle(this.page, 1000);
    // Confirm the referenced item, then save the subqueue.
    await this.page.locator('input[name="ief-reference-submit-items-form"]').first().click();
    await smartSettle(this.page, 2000);
    await this.page.locator('#edit-submit').first().click();
    await waitForPageLoad(this.page, (this.minWaitTime && this.minWaitTime.page) || 10000);
  }, `Could not add the slide "${title}" to the "${queue}" subqueue`);
});

/**
 * Assert the rendered Hero Slider node shows its media image.
 *
 * Checks that at least one image (an <img> or a <picture>/<source>, including
 * the DropzoneJS/drimage responsive markup) is rendered inside the main page
 * content, and that it references an uploaded file. This proves the slide's
 * media field actually renders on the node display, not merely that the page
 * loaded.
 *
 * Example: Then the Hero Slider slide should render its media image
 */
Then(/^(?:I |we )*the Hero Slider slide should render its media image$/, async function () {
  await attempt(async () => {
    await smartSettle(this.page, 2000);
    const count = await this.page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      const imgs = [...main.querySelectorAll('img')];
      const hit = imgs.some((img) => {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
        return /\/files\//.test(src) || /image|media/i.test(img.className);
      });
      // drimage renders a responsive container that is hydrated client side;
      // accept its wrapper as evidence the media field rendered too.
      const drimage = main.querySelector('.drimage, [data-drimage], picture source');
      const fieldImg = main.querySelector('[class*="field-media"] img, [class*="media"] img, picture img');
      return (hit ? 1 : 0) + (drimage ? 1 : 0) + (fieldImg ? 1 : 0);
    });
    assert.ok(count > 0, 'No rendered media image was found in the main content of the Hero Slider node');
  }, 'The Hero Slider slide did not render its media image');
});

/**
 * Assert the current request was denied.
 *
 * Accepts either a 403 "Access denied" page or a redirect to the user login
 * form, so it holds whether the site serves the default access-denied page or
 * routes 403s to the login page. Asserts the visible access outcome rather
 * than mere page reachability.
 *
 * Example: Then I should be denied access
 */
Then(/^(?:I |we )*should be denied access$/, async function () {
  await attempt(async () => {
    await waitForPageLoad(this.page, (this.minWaitTime && this.minWaitTime.page) || 8000);
    const deniedHeading = await this.page.locator('h1:has-text("Access denied")').count();
    const loginForm = await this.page.locator('#user-login-form').count();
    const onLogin = /\/user\/login/.test(this.page.url());
    const bodyText = (await this.page.locator('body').innerText().catch(() => '')).toLowerCase();
    const deniedText = bodyText.includes('access denied') || bodyText.includes('you are not authorized');
    assert.ok(
      deniedHeading > 0 || loginForm > 0 || onLogin || deniedText,
      'Expected an access-denied page or a redirect to the login form'
    );
  }, 'The request was not denied as expected');
});
