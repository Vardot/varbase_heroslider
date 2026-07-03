@varbase_heroslider @content
Feature: Varbase Hero Slider - add content form
  As a site administrator
  I want the Hero Slider content-add form to be reachable with Varbase Hero
  Slider enabled

  Scenario: The content add-overview page is reachable
    Given I am a logged in user with the "Webmaster" user
    When I open the administration page "/node/add"
    Then I should not see "Page not found"

  Scenario: The Hero Slider node add form is reachable
    Given I am a logged in user with the "Webmaster" user
    When I open the administration page "/node/add/varbase_heroslider"
    Then I should not see "Page not found"
    And "#edit-title-0-value" should be visible
