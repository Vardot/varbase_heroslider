@varbase_heroslider @content @create
Feature: Varbase Hero Slider - a slide is created with its content and media
  As an editor
  I want a Hero Slider slide (title, brief, link and its required image media)
  to be saved
  So that the Hero Slider content type is proven to work end to end

  Scenario: The saved slide and its required media appear in the admin lists
    Given I am a logged in user with the "Webmaster" user
    When I am on "/admin/content"
    Then I should see "Automated Hero Slider Slide"
     And I should see "Queued Hero Slider Slide"
    When I am on "/admin/content/media"
    Then I should see "Hero Slider Test Image"


  Scenario: The Hero Slider add form is reachable with its Title field
    Given I am a logged in user with the "Editor" user
    When I am on "/node/add/varbase_heroslider"
    Then I should see "Create Hero slider"
     And "#edit-title-0-value" should be visible
