@varbase_heroslider @content-type
Feature: Varbase Hero Slider - content type and fields
  As a content editor
  I want the Hero Slider content type to provide its real, labelled fields
  So that I can author a hero slide with a heading, brief, call-to-action link
  and a media image

  Background:
    Given I am a logged in user with the "Webmaster" user

  Scenario: The Hero Slider content type exists
    When I am on "/admin/structure/types"
    Then I should see "Hero slider"

  Scenario: The Hero Slider content type provides its labelled fields
    When I am on "/admin/structure/types/manage/varbase_heroslider/fields"
    Then I should see "Slide text"
     And I should see "Call for action link"
     And I should see "Slide media (image/video)"
     And I should see "field_brief"
     And I should see "field_link"
     And I should see "field_media_single"

  Scenario: The Hero Slider add form is reachable with its Title field
    When I am on "/node/add/varbase_heroslider"
    Then I should see "Create Hero slider"
     And "#edit-title-0-value" should be visible
