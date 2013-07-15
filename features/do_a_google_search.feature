Feature: Do a Google Search
  Using a web browser
  I want to perform a Google search

  Scenario: Google Search
    Given I visit http://google.com
    When I enter 'cheese' into 'q'

  Scenario: Google Search Two
    Given I visit http://google.com
    When I enter 'hamburgers' into 'q'