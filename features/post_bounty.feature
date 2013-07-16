Feature: Developer posts a bounty
  Using the code bounty extension
  I want to post a bounty

  Scenario: Developer posts a USD bounty
    Given I visit issue 25 in codebounty/codebounty
    When I post a 5 USD bounty