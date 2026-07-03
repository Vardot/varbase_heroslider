@varbase_heroslider @admin
Feature: Varbase Hero Slider - administration pages
  As a site administrator
  I want the core, media and content-type administration pages to be reachable
  with Varbase Hero Slider and its dependencies enabled

  Scenario: The administration pages are reachable for the administrator
    Given I am a logged in user with the "Webmaster" user
    When I open the administration page "/admin/content"
    Then I should not see "Page not found"
    When I open the administration page "/admin/content/media"
    Then I should not see "Page not found"
    When I open the administration page "/admin/structure"
    Then I should not see "Page not found"
    When I open the administration page "/admin/structure/types"
    Then I should not see "Page not found"
    When I open the administration page "/admin/structure/types/manage/varbase_heroslider"
    Then I should not see "Page not found"
    When I open the administration page "/admin/structure/entityqueue"
    Then I should not see "Page not found"
    When I open the administration page "/admin/config"
    Then I should not see "Page not found"
    When I open the administration page "/admin/people"
    Then I should not see "Page not found"
    When I open the administration page "/admin/reports/status"
    Then I should not see "Page not found"
