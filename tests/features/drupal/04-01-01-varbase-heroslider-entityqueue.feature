@varbase_heroslider @entityqueue
Feature: Varbase Hero Slider - entity queue
  As a site administrator
  I want the Hero Slider entity queue to exist and the queued slide content to
  be available
  So that editors can curate which slides appear in the hero slider

  Background:
    Given I am a logged in user with the "Webmaster" user

  Scenario: The Hero Slider entity queue exists
    When I am on "/admin/structure/entityqueue"
    Then I should see "Hero Slider"

  Scenario: The queued Hero Slider slide exists as content
    When I am on "/admin/content"
    Then I should see "Queued Hero Slider Slide"
