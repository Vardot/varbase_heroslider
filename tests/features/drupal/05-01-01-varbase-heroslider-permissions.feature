@varbase_heroslider @permissions @access
Feature: Varbase Hero Slider - access control
  As a site owner
  I want only permitted roles to create Hero Slider content
  So that the Hero Slider content type respects the editorial permissions the
  default recipe grants

  Scenario: An editor can reach the Hero Slider add form
    Given I am a logged in user with the "Editor" user
    When I am on "/node/add/varbase_heroslider"
    Then I should see "Create Hero slider"
     And "#edit-title-0-value" should be visible

  Scenario: An anonymous visitor is denied the Hero Slider add form
    Given I am an anonymous visitor
    When I am on "/node/add/varbase_heroslider"
    Then I should be denied access
